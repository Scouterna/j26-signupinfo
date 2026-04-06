"""
Smoke tests for dependency update PRs.

These verify that the app boots and key endpoints respond correctly with new
dependencies. External services (Scoutnet, Keycloak) are mocked out.
"""


def test_app_boots(client):
    """TestClient lifespan startup succeeded if we get here."""
    pass


def test_metrics(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert b"http_requests_total" in r.content


def test_app_config(client):
    r = client.get("/app-config")
    assert r.status_code == 200
    data = r.json()
    assert "navigation" in data
    assert len(data["navigation"]) > 0


def test_swagger_docs(client):
    r = client.get("/api/docs")
    assert r.status_code == 200


def test_openapi_schema(client):
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    schema = r.json()
    assert "paths" in schema
    assert "info" in schema
