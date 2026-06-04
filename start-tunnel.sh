#!/bin/bash
pkill -f 'lt --port 8000' 2>/dev/null
nohup /home/deadw4lker/.nvm/versions/node/v24.14.0/bin/lt --port 8000 > /tmp/tunnel.log 2>&1 &
sleep 5
echo "Tunnel URL:"
cat /tmp/tunnel.log
