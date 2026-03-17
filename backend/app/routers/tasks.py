"""
Task monitoring router — check Celery task status and results.

Provides endpoints for the frontend to poll task progress.
"""


from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.user import User
from app.tasks.celery_app import celery_app
from app.utils.auth import get_current_user

router = APIRouter()


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str  # PENDING, STARTED, SUCCESS, FAILURE, RETRY, REVOKED
    result: dict | None = None
    error: str | None = None
    progress: dict | None = None


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get the status of a Celery task.

    Status values:
    - PENDING: Task is waiting to be picked up
    - STARTED: Task is currently running
    - SUCCESS: Task completed successfully (result available)
    - FAILURE: Task failed (error available)
    - RETRY: Task is being retried
    - REVOKED: Task was cancelled
    """
    result = celery_app.AsyncResult(task_id)

    response = TaskStatusResponse(
        task_id=task_id,
        status=result.status,
    )

    if result.successful():
        response.result = result.result if isinstance(result.result, dict) else {"value": result.result}
    elif result.failed():
        response.error = str(result.result) if result.result else "Unknown error"
    elif result.status == "PROGRESS":
        response.progress = result.info if isinstance(result.info, dict) else None

    return response


@router.post("/{task_id}/revoke", status_code=204)
async def revoke_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending or running task."""
    celery_app.control.revoke(task_id, terminate=True)
