"""Tests for config, enums, schemas — no DB or external services needed."""
import uuid
from datetime import datetime, timezone

from app.config import Settings
from app.models.enums import (
    CampaignStatus,
    ContactStatus,
    MessageStatus,
    MessageType,
    UploadStatus,
)
from app.schemas.user import Token, UserCreate, UserResponse
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignUpdate


# ============================================
# Config
# ============================================

class TestSettings:
    def test_default_settings(self):
        s = Settings(
            database_url="postgresql+asyncpg://test:test@localhost/test",
            _env_file=None,
        )
        assert s.app_name == "Auto Follow-Ups"
        assert s.api_prefix == "/api/v1"
        assert s.access_token_expire_minutes == 30
        assert s.max_file_size_mb == 10

    def test_allowed_file_types(self):
        s = Settings(
            database_url="postgresql+asyncpg://test:test@localhost/test",
            _env_file=None,
        )
        assert "csv" in s.allowed_file_types
        assert "xlsx" in s.allowed_file_types
        assert "txt" in s.allowed_file_types
        assert "xls" in s.allowed_file_types


# ============================================
# Enums
# ============================================

class TestEnums:
    def test_campaign_status_values(self):
        assert CampaignStatus.DRAFT == "draft"
        assert CampaignStatus.ACTIVE == "active"
        assert CampaignStatus.PAUSED == "paused"
        assert CampaignStatus.COMPLETED == "completed"
        assert CampaignStatus.ARCHIVED == "archived"

    def test_upload_status_values(self):
        assert UploadStatus.PENDING == "pending"
        assert UploadStatus.PROCESSING == "processing"
        assert UploadStatus.COMPLETED == "completed"
        assert UploadStatus.FAILED == "failed"

    def test_contact_status_values(self):
        assert ContactStatus.NEW == "new"
        assert ContactStatus.MESSAGE_GENERATED == "message_generated"
        assert ContactStatus.REPLIED == "replied"
        assert ContactStatus.OPTED_OUT == "opted_out"

    def test_message_type_values(self):
        assert MessageType.COLD_OUTREACH == "cold_outreach"
        assert MessageType.FOLLOW_UP_1 == "follow_up_1"
        assert MessageType.FOLLOW_UP_2 == "follow_up_2"
        assert MessageType.FOLLOW_UP_3 == "follow_up_3"
        assert MessageType.CUSTOM == "custom"

    def test_message_status_values(self):
        assert MessageStatus.DRAFT == "draft"
        assert MessageStatus.GENERATED == "generated"
        assert MessageStatus.APPROVED == "approved"
        assert MessageStatus.SENT == "sent"
        assert MessageStatus.FAILED == "failed"

    def test_enum_str_mixin(self):
        """All enums should be str subclass for JSON serialization."""
        assert isinstance(CampaignStatus.DRAFT, str)
        assert isinstance(UploadStatus.PENDING, str)
        assert isinstance(MessageType.COLD_OUTREACH, str)


# ============================================
# Schemas
# ============================================

class TestUserSchemas:
    def test_user_create_valid(self):
        u = UserCreate(email="test@example.com", password="secret123", full_name="Test User")
        assert u.email == "test@example.com"
        assert u.full_name == "Test User"
        assert u.company is None

    def test_user_create_with_company(self):
        u = UserCreate(
            email="test@example.com",
            password="secret",
            full_name="Test",
            company="Acme Inc",
        )
        assert u.company == "Acme Inc"

    def test_user_create_invalid_email(self):
        import pytest
        with pytest.raises(Exception):
            UserCreate(email="not-an-email", password="secret", full_name="Test")

    def test_token_schema(self):
        t = Token(access_token="abc.def.ghi")
        assert t.access_token == "abc.def.ghi"
        assert t.token_type == "bearer"

    def test_user_response(self):
        uid = uuid.uuid4()
        now = datetime.now(timezone.utc)
        r = UserResponse(
            id=uid,
            email="a@b.com",
            full_name="A",
            company=None,
            is_active=True,
            is_verified=False,
            created_at=now,
        )
        assert r.id == uid
        assert r.is_active is True


class TestCampaignSchemas:
    def test_campaign_create_minimal(self):
        c = CampaignCreate(name="Test Campaign")
        assert c.name == "Test Campaign"
        assert c.description is None

    def test_campaign_create_full(self):
        c = CampaignCreate(name="Test", description="A test campaign")
        assert c.description == "A test campaign"

    def test_campaign_update_partial(self):
        u = CampaignUpdate(name="New Name")
        assert u.name == "New Name"
        assert u.description is None
        assert u.status is None

    def test_campaign_update_status(self):
        u = CampaignUpdate(status=CampaignStatus.ACTIVE)
        assert u.status == CampaignStatus.ACTIVE

    def test_campaign_response(self):
        uid = uuid.uuid4()
        now = datetime.now(timezone.utc)
        r = CampaignResponse(
            id=uid,
            name="Test",
            description=None,
            status=CampaignStatus.DRAFT,
            total_contacts=10,
            messages_generated=5,
            messages_sent=2,
            created_at=now,
            updated_at=now,
        )
        assert r.total_contacts == 10
        assert r.status == "draft"
