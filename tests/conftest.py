import json
import os

# Must be set before any app module is imported, since config is cached at import time.
os.environ.setdefault(
    "SCOUTNET_PROJECTS",
    json.dumps([{"id": 1, "name": "Test Project", "member_key": "mk1", "question_key": "qk1"}]),
)
os.environ.setdefault("AUTH_DISABLED", "true")
os.environ.setdefault("PERSIST_DIR", "/tmp/j26-signupinfo-test")

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch


@pytest.fixture(scope="session")
def client():
    # Patch scoutnet_init/shutdown so tests don't hit external services.
    # The names are patched in the main module where they were imported.
    with (
        patch("pyapp.app.main.scoutnet_init", new_callable=AsyncMock),
        patch("pyapp.app.main.scoutnet_shutdown", new_callable=AsyncMock),
    ):
        from pyapp.app.main import app

        with TestClient(app) as c:
            yield c
