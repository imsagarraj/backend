#!/bin/bash
set -e
PORT="${PORT:-8000}"
pkill -f "lt --port $PORT" 2>/dev/null || true
nohup npx lt --port "$PORT" > /tmp/tunnel.log 2>&1 &
sleep 5
echo "Tunnel URL:"
grep -o 'https://[^ ]*' /tmp/tunnel.log | head -1
