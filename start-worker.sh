#!/bin/bash
set -e

celery -A celery_app worker --loglevel=info --concurrency=2 &
WORKER_PID=$!

celery -A celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid &
BEAT_PID=$!

trap "kill $WORKER_PID $BEAT_PID 2>/dev/null" EXIT
wait
