#!/bin/bash
set -e
celery -A celery_app worker --loglevel=info --concurrency=1 &
celery -A celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid &
trap "kill $(jobs -p) 2>/dev/null" EXIT
wait
