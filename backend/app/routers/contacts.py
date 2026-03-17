import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.enums import ContactStatus
from app.models.user import User
from app.schemas.contact import (
    BulkDeleteRequest,
    BulkOperationResponse,
    BulkStatusUpdateRequest,
    ContactListResponse,
    ContactResponse,
    ContactStatsResponse,
    ContactUpdate,
)
from app.services import contact_service
from app.services.contact_service import ContactServiceError
from app.utils.auth import get_current_user

router = APIRouter()


# ============================================
# LIST / SEARCH / FILTER
# ============================================

@router.get("/campaign/{campaign_id}", response_model=ContactListResponse)
async def list_contacts(
    campaign_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, max_length=200, description="Search name, email, company, role"),
    status: ContactStatus | None = Query(None, description="Filter by contact status"),
    company: str | None = Query(None, max_length=255, description="Filter by company name"),
    sort_by: str = Query("created_at", pattern="^(created_at|full_name|company|status|email|role)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List contacts for a campaign with search, filtering, sorting, and pagination.

    **Search**: free-text across name, email, company, role.
    **Filters**: status, company.
    **Sort**: created_at, full_name, company, status, email, role.
    """
    page = await contact_service.list_contacts(
        db=db,
        user_id=current_user.id,
        campaign_id=campaign_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        search=search,
        company_filter=company,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return ContactListResponse(
        contacts=page.contacts,
        total=page.total,
        has_more=page.has_more,
    )


@router.get("/campaign/{campaign_id}/stats", response_model=ContactStatsResponse)
async def get_contact_stats(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get contact count grouped by status for dashboard display."""
    return await contact_service.get_campaign_contact_stats(
        db=db, campaign_id=campaign_id, user_id=current_user.id
    )


@router.get("/campaign/{campaign_id}/companies", response_model=list[str])
async def get_companies(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get distinct company names (for filter dropdown in UI)."""
    return await contact_service.get_campaign_companies(
        db=db, campaign_id=campaign_id, user_id=current_user.id
    )


# ============================================
# SINGLE CONTACT CRUD
# ============================================

@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific contact with all details."""
    contact = await contact_service.get_contact_by_id(db, contact_id, current_user.id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a contact's details."""
    try:
        return await contact_service.update_contact(
            db=db,
            contact_id=contact_id,
            user_id=current_user.id,
            update_data=data.model_dump(exclude_unset=True),
        )
    except ContactServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a contact and all associated messages."""
    try:
        await contact_service.delete_contact(db, contact_id, current_user.id)
    except ContactServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# ============================================
# BULK OPERATIONS
# ============================================

@router.post("/bulk/update-status", response_model=BulkOperationResponse)
async def bulk_update_status(
    data: BulkStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk update status for multiple contacts."""
    if len(data.contact_ids) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 contacts per bulk operation")

    count = await contact_service.bulk_update_status(
        db=db,
        contact_ids=data.contact_ids,
        user_id=current_user.id,
        new_status=data.status,
    )
    return BulkOperationResponse(
        affected_count=count,
        message=f"Updated {count} contacts to status '{data.status.value}'",
    )


@router.post("/bulk/delete", response_model=BulkOperationResponse)
async def bulk_delete(
    data: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk delete multiple contacts and their messages."""
    if len(data.contact_ids) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 contacts per bulk operation")

    count = await contact_service.bulk_delete_contacts(
        db=db,
        contact_ids=data.contact_ids,
        user_id=current_user.id,
    )
    return BulkOperationResponse(
        affected_count=count,
        message=f"Deleted {count} contacts",
    )


@router.delete("/upload/{upload_id}", response_model=BulkOperationResponse)
async def delete_contacts_by_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all contacts imported from a specific file upload."""
    count = await contact_service.delete_contacts_by_upload(
        db=db,
        upload_id=upload_id,
        user_id=current_user.id,
    )
    return BulkOperationResponse(
        affected_count=count,
        message=f"Deleted {count} contacts from upload",
    )
