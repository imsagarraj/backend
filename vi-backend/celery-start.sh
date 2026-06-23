#!/bin/bash
set -e

CONCURRENCY="${CELERY_CONCURRENCY:-2}"

start_worker() {
  while true; do
    celery -A celery_app worker --loglevel=info --concurrency="$CONCURRENCY"
    sleep 2
  done
}

start_beat() {
  while true; do
    celery -A celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid
    sleep 2
  done
}

start_worker &
start_beat &
trap "kill $(jobs -p) 2>/dev/null" EXIT
wait
