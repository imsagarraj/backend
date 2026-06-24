#!/bin/bash
# Uptime monitoring check script
# Use with UptimeRobot / Better Uptime / Cron-job.org
#
# Configure a monitor with:
#   URL: https://backend-hnw7.onrender.com/health
#   Interval: 5 minutes
#   Timeout: 30 seconds
#
# For self-hosted monitoring via cron:
#   * * * * * /path/to/scripts/uptime-check.sh
#
# For Slack/Discord alerts on failure, pipe this to webhook.

URL="${1:-https://backend-hnw7.onrender.com/health}"
EXPECTED="${2:-healthy}"

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null)

if [ "$response" != "200" ]; then
  echo "DOWN — HTTP $response from $URL"
  exit 1
fi

body=$(curl -s --max-time 10 "$URL" 2>/dev/null)
if ! echo "$body" | grep -q "$EXPECTED"; then
  echo "DEGRADED — unexpected response: $body"
  exit 1
fi

echo "UP — $URL"
exit 0
