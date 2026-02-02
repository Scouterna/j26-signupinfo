import asyncio
import functools
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import NamedTuple

import httpx
from fastapi import APIRouter, Depends, status

from .authenctication import AuthUser, require_auth_user
from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Suppress asyncio slow task warnings that leak response data
logging.getLogger("asyncio").setLevel(logging.ERROR)

PROJECT_API = "https://www.scoutnet.se/api/project/get"
CACHE_DIR = Path(".dev_cache")

# --- Data class ---


@dataclass
class ProjectCache:
    """Global cache for Scoutnet project data."""

    groups: dict = field(default_factory=dict)
    participants: dict = field(default_factory=dict)
    serviceteam: dict = field(default_factory=dict)
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


class ProjectData(NamedTuple):
    group_response: dict
    participant_response: dict
    participant_group_questions: dict
    serviceteam_response: dict
    serviceteam_questions: dict


# --- Project cache ---

_project_cache = ProjectCache()


def _get_project_cache() -> ProjectCache:
    return _project_cache


# --- Init function ---


async def scoutnet_init() -> None:
    await _update_project_cache()  # Fill cache at start
    return


# --- Local decorators ...


def require_fresh_cache(func):
    """Decorator that ensures project cache is fresh before calling the function.

    If the cache is stale (older than PROJECT_CACHE_MAX_AGE), it will be
    refreshed automatically before the decorated function runs.
    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        if _get_project_cache().is_stale:
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
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.fatal("Failed to fetch %s: %s", url, exc)
        raise RuntimeError


async def _get_all_projectdata_from_scoutnet() -> ProjectData:
    """
    Retrieves all project data from Scoutnet with parallel requests.
    Forms questions for a project are combined into only one dict.

    :return: All project data from Scoutnet
    :rtype: ProjectData
    """

    async def get_project_data(id, group_key, member_key, question_key) -> tuple[dict, dict, dict]:
        # Start questions request first - we need its response to discover form URLs
        questions_url = f"{PROJECT_API}/questions?id={id}&key={question_key}"
        questions_task = asyncio.create_task(_scoutnet_get(questions_url))

        # Start other requests in parallel
        groups_task = None
        if group_key:
            url = f"{PROJECT_API}/groups?flat=true&id={id}&key={group_key}"
            groups_task = asyncio.create_task(_scoutnet_get(url))

        participants_url = f"{PROJECT_API}/participants?id={id}&key={member_key}"
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

        return groups, participants, questions

    # Fetch both projects in parallel
    participant_task = get_project_data(
        settings.PARTICIPANT_PROJECT_ID,
        settings.PARTICIPANT_GROUP_KEY,
        settings.PARTICIPANT_MEMBER_KEY,
        settings.PARTICIPANT_QUESTION_KEY,
    )
    serviceteam_task = get_project_data(
        settings.SERVICETEAM_PROJECT_ID,
        None,
        settings.SERVICETEAM_MEMBER_KEY,
        settings.SERVICETEAM_QUESTION_KEY,
    )

    (gr, pr, pgq), (_, sr, sq) = await asyncio.gather(participant_task, serviceteam_task)

    return ProjectData(
        group_response=gr,
        participant_response=pr,
        participant_group_questions=pgq,
        serviceteam_response=sr,
        serviceteam_questions=sq,
    )


# --- External (and local) functions ---


async def _update_project_cache() -> None:
    from .scoutnet_forms import scoutnet_forms_decoder

    logger.info("Start cache update")
    project_data = await _get_all_projectdata_from_scoutnet()
    cache = _get_project_cache()

    scoutnet_forms_decoder(project_data, cache)

    del project_data  # Force garbage collection
    logger.info("Finish cache update")
    return


@require_fresh_cache
async def get_all_groups() -> list:
    cache = _get_project_cache()
    group_list = sorted(cache.groups.values(), key=lambda g: g["name"])
    return group_list


@require_fresh_cache
async def get_group(gid: int) -> dict | None:
    cache = _get_project_cache()
    return cache.groups.get(gid)


@require_fresh_cache
async def get_serviceteam() -> dict | None:
    cache = _get_project_cache()
    return cache.serviceteam


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
