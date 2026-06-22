#!/bin/bash
set -e

# Use supervisord to manage all processes (auto-restarts on crash)
if [ -n "$REDIS_URL" ]; then
    exec supervisord -c supervisord.conf
else
    echo "REDIS_URL not set — running web only"
    exec uvicorn main:app --host 0.0.0.0 --port $PORT
fi
