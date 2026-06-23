#!/bin/bash
set -e

export PORT=${PORT:-8000}
export CELERY_CONCURRENCY=${CELERY_CONCURRENCY:-2}

if [ -n "$REDIS_URL" ]; then
    exec supervisord -c supervisord.conf
else
    echo "REDIS_URL not set — running web only"
    exec uvicorn main:app --host 0.0.0.0 --port $PORT
fi
