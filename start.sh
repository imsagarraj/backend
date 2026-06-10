#!/bin/bash
set -e

# Always start uvicorn
uvicorn main:app --host 0.0.0.0 --port $PORT &
WEB_PID=$!

# Start celery only if REDIS_URL is configured
if [ -n "$REDIS_URL" ]; then
    celery -A celery_app worker --loglevel=info --concurrency=1 --max-tasks-per-child=10 &
    CELERY_PID=$!
    celery -A celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid &
    BEAT_PID=$!
else
    echo "REDIS_URL not set — skipping Celery worker/beat"
fi

trap "kill $WEB_PID $CELERY_PID $BEAT_PID 2>/dev/null" EXIT
wait
