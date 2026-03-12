import ssl as _ssl
from collections.abc import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


# Detect whether the DB is remote (needs SSL + PgBouncer compat)
_is_remote_db = "localhost" not in settings.database_url and "127.0.0.1" not in settings.database_url

# ============================================
# Async engine (FastAPI)
# ============================================
_async_connect_args: dict = {}
if _is_remote_db:
    _async_connect_args["ssl"] = "require"
    _async_connect_args["prepared_statement_cache_size"] = 0  # Required for Supabase pooler (PgBouncer)

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=_async_connect_args,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ============================================
# Sync engine (Celery workers) — lazy init to avoid
# requiring psycopg2 at import time (e.g. in tests).
# ============================================
_sync_engine = None
_SyncSessionLocal = None


def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        _sync_url = settings.database_url.replace("+asyncpg", "+psycopg2")
        _sync_connect_args: dict = {}
        if _is_remote_db:
            _sync_connect_args["sslmode"] = "require"
        _sync_engine = create_engine(
            _sync_url,
            echo=settings.debug,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True,
            connect_args=_sync_connect_args,
        )
    return _sync_engine


def _get_sync_session_factory():
    global _SyncSessionLocal
    if _SyncSessionLocal is None:
        _SyncSessionLocal = sessionmaker(bind=_get_sync_engine(), expire_on_commit=False)
    return _SyncSessionLocal


# Keep backward-compatible aliases
@property
def sync_engine():
    return _get_sync_engine()


@contextmanager
def get_sync_db() -> Generator[Session, None, None]:
    """Synchronous DB session for use in Celery tasks."""
    factory = _get_sync_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
