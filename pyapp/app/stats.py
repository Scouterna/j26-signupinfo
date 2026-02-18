import logging
import math
from typing import Any

from async_lru import alru_cache
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from .authenctication import AuthUser, require_auth_user
from .config import get_settings
from .scoutnet import (
    find_members,
    get_group_responses,
    get_individual_responses,
    get_project_groups,
    get_project_questions,
    get_projects_info,
)

settings = get_settings()
logger = logging.getLogger(__name__)

stats_router = APIRouter(prefix="/stats", tags=["statistics"])


class Page(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int


@stats_router.get(
    "/projects",
    response_model=dict[int, str],
    status_code=status.HTTP_200_OK,
    response_description="Projects info",
)
async def projects(user: AuthUser = Depends(require_auth_user)):
    """
    Return projects info
    """
    return await get_projects_info()


@stats_router.get(
    "/{project_id}/questions",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    response_description="Projects questions",
)
async def project_questions(project_id: int, user: AuthUser = Depends(require_auth_user)):
    """
    Return projects questions.
    """
    project_questions = await get_project_questions(project_id)
    if not project_questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project_questions


@stats_router.get(
    "/{project_id}/groups",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    response_description="Projects groups",
)
async def project_groups(project_id: int, user: AuthUser = Depends(require_auth_user)):
    """
    Return project groups.
    """
    project_groups = await get_project_groups(project_id)
    if not project_groups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project_groups


@stats_router.get(
    "/{project_id}/groupinfo",
    response_model=Page,
    status_code=status.HTTP_200_OK,
    response_description="Paginated group info",
)
async def groups_responses(
    project_id: int,
    group_id: list[int] | None = Query(default=None),
    page: int = Query(default=1, ge=1, description="Page number"),
    size: int = Query(default=50, ge=1, le=100, description="Page size"),
    user: AuthUser = Depends(require_auth_user),
):
    """
    Return selected group info.
    If none is given, all are returned.
    Response is paginated.
    """
    responses = await get_group_responses(project_id, group_id)
    if not responses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project or one or more groups not found.",
        )

    # if "signupinfo-superuser" not in user.roles:
    #     for record in all:
    #         record.pop("stats", None)

    total = len(responses)
    skip = (page - 1) * size

    return Page(
        items=responses[skip : skip + size],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@stats_router.get(
    "/{project_id}/groupinfo/{group_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    response_description="Group info",
)
async def group_responses(project_id: int, group_id: int, user: AuthUser = Depends(require_auth_user)):
    """
    Return a single group responses.
    """
    responses = await get_group_responses(project_id, group_id)
    if not responses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project or group not found",
        )
    return responses[0]


@stats_router.get(
    "/{project_id}/individualinfo/{member_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    response_description="Individual info",
)
async def individual_responses(project_id: int, member_id: int, user: AuthUser = Depends(require_auth_user)):
    """
    Return an individuals responses.
    """
    responses = await get_individual_responses(project_id, member_id)
    if not responses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found in project.",
        )
    return responses


@stats_router.get(
    "/{project_id}/search_member",
    response_model=list[dict],
    status_code=status.HTTP_200_OK,
    response_description="",
)
async def search_member(
    project_id: int,
    name: str | None = Query(default=""),
    born: str | None = Query(default=""),
    troop: str | None = Query(default=""),
    user: AuthUser = Depends(require_auth_user),
):
    """
    Search for a member according to the search critera.
    If more then 10 hits, nothing is returned.
    """
    responses = await find_members(project_id, name, born, troop)
    if not responses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incorrect project or no members found that match the criteria.",
        )
    if len(responses) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="More then ten members that match the criteria.",
        )
    return responses
