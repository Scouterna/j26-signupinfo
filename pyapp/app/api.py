from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi_pagination import Page, add_pagination, paginate

from .auth import get_active_user
from .config import get_settings
from .models import Participant, Question, User

settings = get_settings()

router = APIRouter()


@router.get("/info", response_model=dict, response_description="Get some basic info about the app")
async def info(request: Request, user: User = Depends(get_active_user)):
    headers = request.headers
    return {
        "app_name": settings.app_name,
        "activity": settings.scoutnet_activity_id,
        "headers": dict(headers),
        "user": user,
    }

@router.get("/app-config", response_model=dict, response_description="Get application configuration for j26-app")
async def app_config(request: Request):
    return {
        "navigation": [
            {
                "type": "page",
                "id": "page_signupinfo_home",
                "label": "SignupInfo",
                "icon": "user-search", # Icon from https://tabler.io/icons
                "path": "../", # Path is relative to the locaiton of the app-config endpoint
            }
        ]
    }

@router.get("/participants", response_model=Page[Participant])
async def participants(form: int | None = None, q: int | str | None = None, q_val: int | str | None = None):

    def q_filter(q, q_val, x):
        if isinstance(q, str) and x[q].upper().startswith(q_val.upper()):
            return True
        else:
            return str(q) in x["questions"] and x["questions"][str(q)] == str(q_val)

    qualifier = None
    # if form == 5085:  # deltagare
    #     qualifier = "24549"
    # elif form == 5734:  # ist
    #     qualifier = "25654"
    # elif form == 6676:  # ledare
    #     qualifier = "31490"
    # elif form == 7126:  # cmt
    #     qualifier = "34445"
    # else:  # unknown form (yet)
    #     return paginate([])

    url = f"{settings.scoutnet_base}/project/get/participants?id={settings.scoutnet_activity_id}&key={settings.scoutnet_participants_key}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
    data = r.json()["forms"]
    p = list(data["participants"].values())

    p = list(filter(lambda x: qualifier in x["questions"], p))
    if q and q != 0:
        p = list(filter(lambda x: q_filter(q, q_val, x), p))
    p = sorted(p, key=lambda x: f"{x['registration_date']} {x['member_no']}")
    return paginate(p)


@router.get("/questions", response_model=list[Question], response_description="Returns questions for a given form")
async def questions(form_id: int, user: User = Depends(get_active_user)) -> list[Question]:
    url = f"{settings.scoutnet_base}/project/get/questions?id={settings.scoutnet_activity_id}&key={settings.scoutnet_questions_key}&form_id={form_id}"
    # print(f'Fetching: {url}')
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
    data = r.json()["questions"]
    tabs = data["tabs"]
    sections = data["sections"]
    status_tabs = [v["id"] for (_, v) in data["tabs"].items() if v["title"] == "Status"]
    health_tabs = [v["id"] for (_, v) in data["tabs"].items() if v["title"] == "Medicinsk information"]
    del data["tabs"]
    del data["sections"]
    questions = []
    health_access = user.has_role("health")
    for id, v in data.items():
        if (v["tab_id"] in health_tabs) and not health_access:
            continue
        questions.append(
            dict(
                {
                    "id": id,
                    "status": True if (v["tab_id"] in status_tabs) else False,
                    "filterable": v["type"] == "choice",
                    "tab_title": tabs[str(v["tab_id"])]["title"] if str(v["tab_id"]) in tabs else "",
                    "tab_description": tabs[str(v["tab_id"])]["description"] if str(v["tab_id"]) in tabs else "",
                    "section_title": (
                        sections[str(v["section_id"])]["title"] if str(v["section_id"]) in sections else ""
                    ),
                },
                **v,
            )
        )
    questions = sorted(questions, key=lambda x: f"{x['tab_id']} {x['section_id']}")
    return questions


@router.get("/forms", response_model=dict[int, str], response_description="Get available forms")
async def forms() -> dict[int, str]:
    url = f"{settings.scoutnet_base}/project/get/questions?id={settings.scoutnet_activity_id}&key={settings.scoutnet_questions_key}"
    # print(f"Fetching: {url}")
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
    data = r.json()["forms"]
    res = {key: value["title"] if value["title"] else "" for (key, value) in data.items()}
    return res


@router.get("/userinfo", response_model=User, response_description="Get user info")
async def get_userinfo(active_user: User = Depends(get_active_user)):
    return active_user