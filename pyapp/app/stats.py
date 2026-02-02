import logging
import math
from typing import Any

from async_lru import alru_cache
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from .authenctication import AuthUser, require_auth_user
from .config import get_settings
from .scoutnet import get_all_groups, get_group, get_serviceteam

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
    "/groups/all",
    response_model=Page,
    status_code=status.HTTP_200_OK,
    response_description="Paginated group statistics",
)
async def get_all_statistics(
    user: AuthUser = Depends(require_auth_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
):
    """
    Return all available group statistics for all participants excluding service team, based on user privileges
    """
    all = await get_all_groups()
    if "signupinfo-superuser" not in user.roles:
        for record in all:
            record.pop("stats", None)

    total = len(all)
    skip = (page - 1) * size

    return Page(
        items=all[skip : skip + size],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@stats_router.get(
    "/group/{group_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    responses={404: {"description": "Group not found"}},
    response_description="A group statistics",
)
async def get_group_statistics(group_id: int, user: AuthUser = Depends(require_auth_user)):
    """
    Return group statistics for a single group, based on user privileges
    """
    stat = await get_group(group_id)
    if not stat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    if "signupinfo-superuser" not in user.roles:
        stat.pop("stats", None)

    return stat


@stats_router.get(
    "/serviceteam",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    response_description="Service team statistics",
)
async def get_serviceteam_statistics(user: AuthUser = Depends(require_auth_user)):
    """
    Return group statistics for a single group, based on user privileges
    """
    stat = await get_serviceteam()
    if "signupinfo-superuser" not in user.roles:
        stat.pop("stats", None)

    return stat
