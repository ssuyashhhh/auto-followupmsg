import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, campaigns, contacts, messages, prompt_templates, tasks, uploads

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown — close DB connections, etc.
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-powered cold outreach and follow-up message generator",
    lifespan=lifespan,
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
)

# CORS — restrict origins in production
_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.frontend_url:
    # Support comma-separated URLs for multiple Vercel deployments
    for url in settings.frontend_url.split(","):
        _origins.append(url.strip().rstrip("/"))

logger.info("CORS allowed origins: %s", _origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.app_name}


# Register routers
app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth", tags=["Auth"])
app.include_router(campaigns.router, prefix=f"{settings.api_prefix}/campaigns", tags=["Campaigns"])
app.include_router(uploads.router, prefix=f"{settings.api_prefix}/uploads", tags=["Uploads"])
app.include_router(contacts.router, prefix=f"{settings.api_prefix}/contacts", tags=["Contacts"])
app.include_router(messages.router, prefix=f"{settings.api_prefix}/messages", tags=["Messages"])
app.include_router(prompt_templates.router, prefix=f"{settings.api_prefix}/prompts", tags=["Prompt Templates"])
app.include_router(tasks.router, prefix=f"{settings.api_prefix}/tasks", tags=["Tasks"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _origins:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}"},
        headers=headers,
    )
