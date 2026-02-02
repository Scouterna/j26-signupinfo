from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PARTICIPANT_MEMBER_KEY: str
    PARTICIPANT_GROUP_KEY: str
    PARTICIPANT_QUESTION_KEY: str
    SERVICETEAM_MEMBER_KEY: str
    SERVICETEAM_QUESTION_KEY: str
    PARTICIPANT_PROJECT_ID: str = "52710"
    SERVICETEAM_PROJECT_ID: str = "52716"
    PROJECT_CACHE_MAX_AGE_H: int = 24  # In hours
    SESSION_SECRET_KEY: str = "change-me"
    API_PREFIX: str = "/api"
    ROOT_PATH: str = ""
    AUTH_DISABLED: bool = False

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
