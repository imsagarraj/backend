#!/bin/bash
set -e
cd "$(dirname "$0")/vi-backend"
if [ -d venv ]; then
  source venv/bin/activate
fi
PORT="${PORT:-8000}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
