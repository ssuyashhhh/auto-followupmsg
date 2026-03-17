"""
Contacts database service — CRUD, search, filtering, bulk operations.

All methods enforce user-scoped access (row-level isolation).
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.enums import ContactStatus


@dataclass
class ContactPage:
    """Paginated contact result."""
    contacts: list[Contact]
    total: int
    has_more: bool


class ContactServiceError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


# ============================================
# READ operations
# ============================================

async def get_contact_by_id(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Contact | None:
    """Get a single contact owned by the user."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_contacts(
    db: AsyncSession,
    user_id: uuid.UUID,
    campaign_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
    status_filter: ContactStatus | None = None,
    search: str | None = None,
    company_filter: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> ContactPage:
    """
    List contacts for a campaign with filtering, search, and pagination.

    Args:
        search: Free-text search across name, email, company, role
        status_filter: Filter by contact status enum
        company_filter: Exact company name filter
        sort_by: Column to sort by (created_at, full_name, company, status)
        sort_order: 'asc' or 'desc'
    """
    base = select(Contact).where(
        Contact.campaign_id == campaign_id,
        Contact.user_id == user_id,
    )

    # Apply filters
    if status_filter:
        base = base.where(Contact.status == status_filter)

    if company_filter:
        base = base.where(Contact.company == company_filter)

    if search:
        pattern = f"%{search}%"
        base = base.where(
            or_(
                Contact.full_name.ilike(pattern),
                Contact.email.ilike(pattern),
                Contact.company.ilike(pattern),
                Contact.role.ilike(pattern),
            )
        )

    # Count total matching rows
    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    # Sort
    sort_column = _get_sort_column(sort_by)
    if sort_order == "asc":
        base = base.order_by(sort_column.asc())
    else:
        base = base.order_by(sort_column.desc())

    # Paginate
    result = await db.execute(base.offset(skip).limit(limit))
    contacts = list(result.scalars().all())

    return ContactPage(
        contacts=contacts,
        total=total,
        has_more=(skip + limit) < total,
    )


def _get_sort_column(sort_by: str):
    """Map sort_by string to SQLAlchemy column."""
    mapping = {
        "created_at": Contact.created_at,
        "full_name": Contact.full_name,
        "company": Contact.company,
        "status": Contact.status,
        "email": Contact.email,
        "role": Contact.role,
    }
    return mapping.get(sort_by, Contact.created_at)


async def get_contacts_by_campaign(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[Contact]:
    """Get all contacts for a campaign (no pagination, for internal use)."""
    result = await db.execute(
        select(Contact).where(
            Contact.campaign_id == campaign_id,
            Contact.user_id == user_id,
        )
    )
    return list(result.scalars().all())


async def get_campaign_companies(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[str]:
    """Get distinct company names for a campaign (for filter dropdown)."""
    result = await db.execute(
        select(Contact.company)
        .where(
            Contact.campaign_id == campaign_id,
            Contact.user_id == user_id,
            Contact.company.isnot(None),
        )
        .distinct()
        .order_by(Contact.company)
    )
    return [row[0] for row in result.all()]


async def get_campaign_contact_stats(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """Get contact count grouped by status for a campaign."""
    result = await db.execute(
        select(Contact.status, func.count(Contact.id))
        .where(
            Contact.campaign_id == campaign_id,
            Contact.user_id == user_id,
        )
        .group_by(Contact.status)
    )
    stats = {row[0].value: row[1] for row in result.all()}
    total = sum(stats.values())
    return {"total": total, "by_status": stats}


# ============================================
# WRITE operations
# ============================================

async def update_contact(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
    update_data: dict,
) -> Contact:
    """Update a contact's fields. Returns updated contact."""
    contact = await get_contact_by_id(db, contact_id, user_id)
    if not contact:
        raise ContactServiceError("Contact not found", status_code=404)

    for field, value in update_data.items():
        if hasattr(contact, field):
            setattr(contact, field, value)

    await db.flush()
    await db.refresh(contact)
    return contact


async def update_contact_status(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
    new_status: ContactStatus,
) -> Contact:
    """Update a contact's status."""
    return await update_contact(db, contact_id, user_id, {"status": new_status})


async def bulk_update_status(
    db: AsyncSession,
    contact_ids: list[uuid.UUID],
    user_id: uuid.UUID,
    new_status: ContactStatus,
) -> int:
    """Bulk update status for multiple contacts. Returns count of updated rows."""
    result = await db.execute(
        update(Contact)
        .where(
            Contact.id.in_(contact_ids),
            Contact.user_id == user_id,
        )
        .values(status=new_status)
    )
    await db.flush()
    return result.rowcount  # pyright: ignore[reportAttributeAccessIssue]


async def delete_contact(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a contact and its messages. Returns True if deleted."""
    contact = await get_contact_by_id(db, contact_id, user_id)
    if not contact:
        raise ContactServiceError("Contact not found", status_code=404)

    await db.delete(contact)
    await db.flush()
    return True


async def bulk_delete_contacts(
    db: AsyncSession,
    contact_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> int:
    """Bulk delete contacts. Returns count of deleted rows."""
    result = await db.execute(
        delete(Contact).where(
            Contact.id.in_(contact_ids),
            Contact.user_id == user_id,
        )
    )
    await db.flush()
    return result.rowcount  # pyright: ignore[reportAttributeAccessIssue]


async def delete_contacts_by_upload(
    db: AsyncSession,
    upload_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    """Delete all contacts from a specific upload. Returns count deleted."""
    result = await db.execute(
        delete(Contact).where(
            Contact.upload_id == upload_id,
            Contact.user_id == user_id,
        )
    )
    await db.flush()
    return result.rowcount  # pyright: ignore[reportAttributeAccessIssue]
