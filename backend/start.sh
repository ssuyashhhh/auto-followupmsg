#!/bin/bash
# start.sh — Runs uvicorn + celery worker in the same container
# (Render free tier only allows web services, not background workers)

set -e

echo "Starting Celery worker..."
celery -A app.tasks.celery_app worker \
  --loglevel=info \
  --concurrency=2 \
  &

echo "Starting Celery beat..."
celery -A app.tasks.celery_app beat \
  --loglevel=info \
  &

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
