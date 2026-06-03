#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate

# Kill old processes
kill $(lsof -ti:8000) 2>/dev/null

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 &
sleep 3

# Start tunnel
npx localtunnel --port 8000 &
sleep 5

# Get URL
URL=$(cat /proc/*/fd/1 2>/dev/null | grep -oP 'https://[a-z-]+\.loca\.lt' | head -1)
[ -z "$URL" ] && URL="check output above"

echo ""
echo "==================== READY ===================="
echo "Server: http://localhost:8000"
echo "Webhook URL: $URL/api/v1/webhook/whatsapp"

echo ""
echo "Paste this in Meta Developer Console -> Webhook -> Callback URL:"
echo "$URL/api/v1/webhook/whatsapp"
echo "================================================"
echo ""
echo "Server running. Press Ctrl+C to stop."
wait
