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
    individual_answers: dict = field(default_factory=dict)  # member_no -> {question_key: value}
    group_answers: dict = field(default_factory=dict)  # question_key -> raw value
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


# --- Project cache ---

_project_cache = ProjectCache()


# --- Init function ---


async def scoutnet_init() -> None:
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


@dev_cache
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


# --- External (and local) functions ---


async def _update_project_cache() -> None:
    from .scoutnet_forms import scoutnet_forms_decoder

    logger.info("Start cache update")
    all_data = await _get_all_projectdata_from_scoutnet()
    scoutnet_forms_decoder(all_data, _project_cache)
    del all_data  # Force garbage collection (I think)
    logger.info("Finish cache update")
    return


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
    groups = {p.name: p.id for p in sorted(project.groups.values(), key=lambda g: g.name.lower())}
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
        or not (response := group.individual_answers.get(member_id))
    ):
        logger.error("Data integrity error in scoutnet_forms")
        return None  # Data integrity error in scoutnet_forms

    return response


@require_fresh_cache
async def find_members(project_id: int, name: str, born: str, troop: str) -> list[dict] | None:
    if not (project := _project_cache.projects.get(project_id)):
        return None

    # Pre-resolve group_id -> name for troop matching and result display
    group_names = {gid: g.name for gid, g in project.groups.items()}
    troop_lower = troop.lower()
    name_lower = name.lower()

    results = []
    for member_no, p in project.participants.items():
        if name_lower and name_lower not in p["name"].lower():
            continue
        if born and not p["born"].startswith(born):
            continue
        if troop_lower:
            gid = p.get("registration_group") or p.get("member_group", 0)
            if troop_lower not in group_names.get(gid, "").lower():
                continue
        result = {"member_no": member_no, **p}
        if "member_group" in result:
            result["member_group"] = group_names.get(result["member_group"], result["member_group"])
        if "registration_group" in result:
            result["registration_group"] = group_names.get(result["registration_group"], result["registration_group"])
        results.append(result)

    return results


# --- API functions ---

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
