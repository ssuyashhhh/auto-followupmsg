from app.routers.auth import router as auth_router
from app.routers.campaigns import router as campaigns_router
from app.routers.contacts import router as contacts_router
from app.routers.messages import router as messages_router
from app.routers.prompt_templates import router as prompt_templates_router
from app.routers.tasks import router as tasks_router
from app.routers.uploads import router as uploads_router

__all__ = [
    "auth_router",
    "campaigns_router",
    "contacts_router",
    "messages_router",
    "prompt_templates_router",
    "tasks_router",
    "uploads_router",
]
