#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

while true; do
  echo "[$(date)] Starting cloudflared tunnel..." >> tunnel.log
  ./cloudflared tunnel --url http://127.0.0.1:5195 2>&1 | tee -a tunnel.log | grep --line-buffered -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" > tunnel_url.txt
  echo "[$(date)] Tunnel disconnected, restarting in 3s..." >> tunnel.log
  sleep 3
done
