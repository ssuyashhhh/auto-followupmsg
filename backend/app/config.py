import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Settings(BaseSettings):
    # App
    app_name: str = "Auto Follow-Ups"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/auto_followups"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_bucket: str = "uploads"

    # AI
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    default_ai_model: str = "llama-3.3-70b-versatile"

    # Frontend (for CORS)
    frontend_url: str = ""

    # Auth
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # File Upload
    max_file_size_mb: int = 10
    allowed_file_types: list[str] = ["csv", "txt", "xlsx", "xls"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"), 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
