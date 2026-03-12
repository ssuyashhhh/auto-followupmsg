import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ContactStatus


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id", ondelete="SET NULL"), index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    company: Mapped[str | None] = mapped_column(String(255), index=True)
    role: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    raw_data: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[ContactStatus] = mapped_column(
        Enum(ContactStatus, values_callable=lambda e: [x.value for x in e], name="contactstatus", create_type=False),
        default=ContactStatus.NEW, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="contacts")
    campaign = relationship("Campaign", back_populates="contacts")
    upload = relationship("Upload", back_populates="contacts")
    messages = relationship("Message", back_populates="contact", cascade="all, delete-orphan")
