"""Tests for the FastAPI app startup — routes registered, health check."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


class TestHealthCheck:
    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestRouterRegistration:
    def test_openapi_loads(self, client):
        response = client.get("/api/v1/openapi.json")
        assert response.status_code == 200
        spec = response.json()
        assert "paths" in spec

    def test_auth_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        assert "/api/v1/auth/register" in paths
        assert "/api/v1/auth/login" in paths
        assert "/api/v1/auth/me" in paths

    def test_campaign_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        assert "/api/v1/campaigns/" in paths

    def test_upload_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        # Check that at least one upload path exists
        upload_paths = [p for p in paths if "/uploads/" in p]
        assert len(upload_paths) > 0

    def test_contacts_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        contact_paths = [p for p in paths if "/contacts/" in p]
        assert len(contact_paths) > 0

    def test_messages_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        message_paths = [p for p in paths if "/messages/" in p]
        assert len(message_paths) > 0

    def test_prompts_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        prompt_paths = [p for p in paths if "/prompts/" in p]
        assert len(prompt_paths) > 0

    def test_tasks_routes_registered(self, client):
        response = client.get("/api/v1/openapi.json")
        paths = response.json()["paths"]
        task_paths = [p for p in paths if "/tasks/" in p]
        assert len(task_paths) > 0


class TestCORS:
    def test_cors_allows_localhost(self, client):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


class TestUnauthenticatedAccess:
    def test_campaigns_requires_auth(self, client):
        response = client.get("/api/v1/campaigns/")
        assert response.status_code == 401

    def test_contacts_requires_auth(self, client):
        response = client.get("/api/v1/contacts/campaign/some-id")
        assert response.status_code == 401

    def test_messages_requires_auth(self, client):
        response = client.get("/api/v1/messages/campaign/some-id")
        assert response.status_code == 401
