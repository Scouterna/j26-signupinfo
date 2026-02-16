from functools import lru_cache

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class ProjectConfig(BaseModel):
    """Configuration for a single Scoutnet project."""

    id: int
    name: str
    member_key: str
    question_key: str
    group_key: str = ""  # Optional; empty string = no groups for this project


class Settings(BaseSettings):
    SCOUTNET_PROJECTS: list[ProjectConfig]
    PROJECT_CACHE_MAX_AGE_H: int = 24  # In hours
    SESSION_SECRET_KEY: str = "change-me"
    API_PREFIX: str = "/api"
    ROOT_PATH: str = ""
    AUTH_DISABLED: bool = False

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
