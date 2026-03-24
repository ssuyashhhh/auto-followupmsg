import ssl

from celery import Celery

from app.config import settings

celery_app = Celery(
    "auto_followups",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.parse_tasks",
        "app.tasks.ai_tasks",
    ],
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,

    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Reliability
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Rate limiting for AI APIs
    task_default_rate_limit="10/m",

    # Result expiry
    result_expires=3600,

    # Beat schedule (for follow-up scheduling)
    beat_schedule={
        "check-scheduled-followups": {
            "task": "app.tasks.ai_tasks.process_scheduled_followups",
            "schedule": 300.0,  # Every 5 minutes
        },
    },
)

# Upstash Redis requires TLS — enable SSL when rediss:// is used
if settings.redis_url.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_REQUIRED}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_REQUIRED}
