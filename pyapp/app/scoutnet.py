import asyncio
import functools
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, status

from .authenctication import AuthUser, require_auth_user
from .config import ProjectConfig, get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Suppress asyncio slow task warnings that leak response data
logging.getLogger("asyncio").setLevel(logging.ERROR)

PROJECT_API = "https://www.scoutnet.se/api/project/get"
CACHE_DIR = Path(".dev_cache")

# --- Data classes ---


@dataclass
class ScoutnetProjectData:
    """Raw data fetched from Scoutnet for one project."""

    project_id: int
    project_name: str
    groups: dict  # Empty dict if project has no group_key
    participants: dict
    questions: dict  # Combined: {"sections": {...}, "questions": {...}}


@dataclass
class CachedGroup:
    """Decoded data for a single group within a project."""

    id: int
    name: str
    num_participants: int = 0
    aggregated: dict = field(default_factory=dict)  # section_title -> {question_key: counts/values}
    raw_individual_answers: dict = field(default_factory=dict)  # member_no -> {question_key: value}
    raw_group_answers: dict = field(default_factory=dict)  # question_key -> raw value
    contact: dict | None = None


@dataclass
class CachedProject:
    """Decoded data for a single Scoutnet project."""

    project_id: int
    project_name: str
    participants: dict = field(default_factory=dict)  # member_no -> {name, born, ...}
    questions: dict = field(default_factory=dict)  # decoded questions dict from Scoutnet
    groups: dict = field(default_factory=dict)  # group_id -> CachedGroup


@dataclass
class ProjectCache:
    """Global cache for decoded Scoutnet project data."""

    projects: dict = field(default_factory=dict)  # project_id -> CachedProject
    group_map: dict[int, str] = field(default_factory=dict)
    updated_at: float = 0  # 0 = never updated

    def mark_updated(self):
        """Call this after updating any data fields."""
        self.updated_at = time.time()

    @property
    def is_loaded(self) -> bool:
        return self.updated_at > 0

    @property
    def is_stale(self) -> bool:
        """Check if cache is stale (never loaded or older than max age)."""
        if not self.is_loaded:
            return True
        return (time.time() - self.updated_at) > settings.PROJECT_CACHE_MAX_AGE_H * 3600


# --- Project cache global ---

_project_cache = ProjectCache()


# --- Init function ---


async def scoutnet_init() -> None:
    await _load_initial_group_map()  # Retrive an initial group map
    await _update_project_cache()  # Fill cache at start
    return


# --- Local decorators ...


def require_fresh_cache(func):
    """Decorator that ensures project cache is fresh before calling the function.

    If the cache is stale (older than PROJECT_CACHE_MAX_AGE_H), it will be
    refreshed automatically before the decorated function runs.
    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        if _project_cache.is_stale:
            logger.debug("Project cache is stale, refreshing...")
            await _update_project_cache()
        return await func(*args, **kwargs)

    return wrapper


def dev_cache(func):
    """Cache HTTP GET results to local files during development.

    Uses a hash of the URL as filename. If cached file exists,
    returns its content instead of making the HTTP request.
    """

    @functools.wraps(func)
    async def wrapper(url: str) -> dict:
        CACHE_DIR.mkdir(exist_ok=True)
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
        cache_file = CACHE_DIR / f"{url_hash}.json"

        if cache_file.exists():
            logger.debug("Using cached response for %s", url)
            return json.loads(cache_file.read_text())

        result = await func(url)
        cache_file.write_text(json.dumps(result, indent=2))
        logger.debug("Cached response for %s", url)
        return result

    return wrapper


# --- Scoutnet retrieve functions ---


# @dev_cache
async def _scoutnet_get(url) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            response = await http_client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.fatal("Failed to fetch %s: %s", url, exc)
        raise RuntimeError


async def _get_all_projectdata_from_scoutnet() -> list[ScoutnetProjectData]:
    """
    Retrieves project data from Scoutnet for all configured projects.
    Each project's form questions are combined into one dict.

    :return: List of project data, one per configured project
    """

    async def fetch_project(project: ProjectConfig) -> ScoutnetProjectData:
        # Start questions request first - we need its response to discover form URLs
        questions_url = f"{PROJECT_API}/questions?id={project.id}&key={project.question_key}"
        questions_task = asyncio.create_task(_scoutnet_get(questions_url))

        # Start other requests in parallel
        groups_task = None
        if project.group_key:
            url = f"{PROJECT_API}/groups?flat=true&id={project.id}&key={project.group_key}"
            groups_task = asyncio.create_task(_scoutnet_get(url))

        participants_url = f"{PROJECT_API}/participants?id={project.id}&key={project.member_key}"
        participants_task = asyncio.create_task(_scoutnet_get(participants_url))

        # Wait for questions first (usually fast), then immediately start form fetches
        questions_forms = await questions_task
        forms = list(questions_forms["forms"].values())
        form_tasks = [asyncio.create_task(_scoutnet_get(f["endpoint_url"])) for f in forms]

        # Now wait for everything else in parallel
        participants = await participants_task
        groups = await groups_task if groups_task else {}
        form_results = await asyncio.gather(*form_tasks)

        questions = {"sections": {}, "questions": {}}
        for forms_data in form_results:
            questions["sections"][forms_data["form"]["type"]] = forms_data["sections"]
            questions["questions"].update(forms_data["questions"])

        return ScoutnetProjectData(
            project_id=project.id,
            project_name=project.name,
            groups=groups,
            participants=participants,
            questions=questions,
        )

    # Fetch all configured projects in parallel
    results = await asyncio.gather(*[fetch_project(p) for p in settings.SCOUTNET_PROJECTS])
    return list(results)


# --- Local functions ---


async def _update_project_cache() -> None:
    from .scoutnet_forms import scoutnet_forms_decoder

    logger.info("Start cache update")
    all_data = await _get_all_projectdata_from_scoutnet()
    scoutnet_forms_decoder(all_data, _project_cache)
    del all_data  # Force garbage collection (I think)
    logger.info("Finish cache update")
    return


async def _load_initial_group_map() -> None:
    group_map = {}
    if settings.SCOUTNET_BODYLIST_KEY:  # Fetch map from Scoutnet
        try:
            url = f"https://scoutnet.se/api/body_key_list?id={settings.SCOUTNET_BODYLIST_ID}&key={settings.SCOUTNET_BODYLIST_KEY}"
            raw_map = await _scoutnet_get(url)
            group_map = {g["body_id"]: g["body_name"] for g in raw_map.values() if g.get("body_type") == "group"}
        except Exception:
            logger.warning("Failed to fetch group_map from Scoutnet, falling back to local file")
    if not group_map:
        try:  # Check local file instead
            map_file = Path(__file__).resolve().parent.parent / "group_map.json"
            raw = json.loads(map_file.read_text(encoding="utf-8"))
            group_map = {int(k): v for k, v in raw.items()}
        except Exception:
            logger.warning("Failed to load group_map from local file, using empty initial map")

    _project_cache.group_map = group_map
    logger.info("Loaded group_map with %d entries", len(_project_cache.group_map))


# --- Functions called from the API handlers in stats.py ---


@require_fresh_cache
async def get_project(project_id: int) -> CachedProject | None:
    """Return all cached data for a project."""
    return _project_cache.projects.get(project_id)


@require_fresh_cache
async def get_project_group(project_id: int, group_id: int) -> CachedProject | None:
    """Return all cached data for a group."""
    return _project_cache.projects.get(project_id).get(group_id)


@require_fresh_cache
async def get_projects_info() -> dict[int, str]:
    """Return infor about valid projects"""
    project_info = {proj.project_id: proj.project_name for proj in _project_cache.projects.values()}
    return project_info


@require_fresh_cache
async def get_project_questions(project_id: int) -> dict | None:
    """Return project questions"""
    if not (project := _project_cache.projects.get(project_id)):
        return None
    return project.questions


@require_fresh_cache
async def get_project_groups(project_id: int) -> dict | None:
    """Return project groups"""
    if not (project := _project_cache.projects.get(project_id)):
        return None
    groups = {p.id: p.name for p in sorted(project.groups.values(), key=lambda g: g.name.lower())}
    return groups


@require_fresh_cache
async def get_group_responses(project_id: int, group_id: int | list[int] | None) -> list | None:
    """
    Return one or more group data indictated by the group_id (single id or a list id id's).
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None

    if group_id is None:  # Return alla groups
        group_id = list(project.groups.keys())

    if type(group_id) is int:
        group_id = [group_id]  # Convert single group request

    if not all(gid in project.groups for gid in group_id):
        return None  # Some requested gorups are missing

    data = [
        {
            "id": gdata.id,
            "name": gdata.name,
            "num_participants": gdata.num_participants,
            "stats": gdata.aggregated,
        }
        for gid, gdata in project.groups.items()
        if gid in group_id
    ]

    return data


@require_fresh_cache
async def get_group_summary(project_id: int, group_id: int | list[int] | None) -> dict | None:
    """
    Aggregate stats across the requested groups and return a summary.
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None

    if group_id is None:
        group_id = list(project.groups.keys())
    if isinstance(group_id, int):
        group_id = [group_id]
    group_id = list(dict.fromkeys(group_id))  # deduplicate, preserving order
    if not all(gid in project.groups for gid in group_id):
        return None

    total_participants = sum(project.groups[gid].num_participants for gid in group_id)
    stats: dict = {}
    for secnum in ["Kön", "Avgift"]:
        sec = stats[secnum] = {}
        for gid in group_id:
            val = project.groups[gid].aggregated.get(secnum, {})
            for rval, rcnt in val.items():  # Individual choices: sum counts
                sec[rval] = sec.get(rval, 0) + rcnt

    for secnum in project.questions:
        sec = stats[secnum] = {}
        for qnum, qinfo in project.questions[secnum]["questions"].items():
            if qnum in [88196, 88204, 88220, 88217, 21325, 21326, 21330]:
                continue  # Skip some questions for the moment (decrease size)
            if qinfo["type"] == "boolean":
                sec[qnum] = sum(project.groups[gid].aggregated.get(secnum, {}).get(qnum) or 0 for gid in group_id)
            elif qinfo["type"] == "choice":
                q = sec.setdefault(qnum, {})
                for gid in group_id:
                    if val := project.groups[gid].aggregated.get(secnum, {}).get(qnum):
                        if isinstance(val, dict):
                            for rval, rcnt in val.items():  # Individual choices: sum counts
                                q[rval] = q.get(rval, 0) + rcnt
                        else:
                            q[val] = q.get(val, 0) + 1  # Group choice: count groups per choice
            elif qinfo["type"] == "text":
                sec[qnum] = [
                    v
                    for gid in group_id
                    if (v := project.groups[gid].aggregated.get(secnum, {}).get(qnum)) and isinstance(v, str)
                ]
            elif qinfo["type"] == "number":
                sec[qnum] = sum(int(project.groups[gid].aggregated.get(secnum, {}).get(qnum, 0)) for gid in group_id)
                pass
            elif qinfo["type"] == "leader_select":
                pass
            elif qinfo["type"] == "other_unsupported_by_api":
                # sec[qnum] = [
                #     v
                #     for gid in group_id
                #     if (v := project.groups[gid].aggregated.get(secnum, {}).get(qnum)) and isinstance(v, str)
                # ]
                pass
            else:
                pass

    return {"total_participants": total_participants, "num_groups": len(group_id), "stats": stats}


@require_fresh_cache
async def get_individual_responses(project_id: int, member_id: int) -> dict | None:
    """
    Returns an individuals response to questions.
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None  # Project not found
    if not (participant := project.participants.get(member_id)):
        return None  # Participant not found
    if (
        not (group_id := participant.get("registration_group"))
        or not (group := project.groups.get(group_id))
        or not (response := group.raw_individual_answers.get(member_id))
    ):
        logger.error("Data integrity error in scoutnet_forms")
        return None  # Data integrity error in scoutnet_forms

    return response


@require_fresh_cache
async def get_individuals_by_group(project_id: int, group_id: int) -> list[dict] | None:
    """
    Return all individuals (with their responses) for a single group.
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None
    if not (group := project.groups.get(group_id)):
        return None

    results = []
    for member_no, response in group.raw_individual_answers.items():
        participant = project.participants.get(member_no)
        if not participant:
            continue
        entry = {
            "member_no": member_no,
            "name": participant.get("name", ""),
            "born": participant.get("born", ""),
            "group_id": group_id,
            "group_name": group.name,
            "responses": response,
        }
        if participant.get("email"):
            entry["email"] = participant["email"]
        if participant.get("mobile"):
            entry["mobile"] = participant["mobile"]
        results.append(entry)

    return results


@require_fresh_cache
async def find_members(project_id: int, name: str, born: str, group: str) -> list[dict] | None:
    """
    Find and return a list of participants that match the provided criteria.
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None

    group_lower = group.lower()
    name_lower = name.lower()
    group_names = _project_cache.group_map

    results = []
    for member_no, p in project.participants.items():
        if name_lower and name_lower not in p["name"].lower():
            continue
        if born and not p["born"].startswith(born):
            continue
        if group_lower:
            if group_lower not in group_names.get(p.get("registration_group", 0), "").lower() and (
                p.get("member_group") == p.get("registration_group")
                or group_lower not in group_names.get(p.get("member_group", 0), "").lower()
            ):
                continue
        result = {"member_no": member_no, **p}
        result["member_group"] = group_names.get(result["member_group"], result["member_group"])
        result["registration_group"] = group_names.get(result["registration_group"], result["registration_group"])
        results.append(result)

    return results


async def get_question_summary(
    project_id: int, question_id: int, group_ids: list[int] | None
) -> dict[int, dict] | None:
    """
    Return ....
    """
    if not (project := _project_cache.projects.get(project_id)):
        return None

    if not group_ids:
        group_ids = list(project.groups)  # All groups

    section_id = next((sid for sid, sec in project.questions.items() if question_id in sec.get("questions", {})), None)
    if not section_id:
        return {question_id: {}}
    type = project.questions[section_id]["questions"][question_id]["type"]

    res = {}
    for gid in group_ids:
        if not (group := project.groups.get(gid)):
            return None  # Non existing group!
        resp = group.aggregated.get(section_id, {}).get(question_id)
        if resp:
            if type == "choice":
                if isinstance(resp, int):
                    res.setdefault(resp, []).append(gid)
                elif isinstance(resp, dict):
                    for k, v in resp.items():
                        res.setdefault(k, []).append(gid)
                else:
                    pass  # Check for other possibilities?
            elif type == "boolean":
                res.setdefault("checked", []).append(gid)
            elif type == "text":
                res.setdefault("responded", []).append(gid)
            else:
                pass  # Check for other possibilities?

    return {question_id: res}


# --- API routes ---

scoutnet_router = APIRouter(prefix="/scoutnet", tags=["Scoutnet"])


@scoutnet_router.get(
    "/refresh",
    response_model=None,
    status_code=status.HTTP_200_OK,
    response_description="All OK",
)
async def scoutnet_refresh(user: AuthUser = Depends(require_auth_user)):
    """
    Refetches all data from Scoutnet and fills cache
    """
    await _update_project_cache()
    return
