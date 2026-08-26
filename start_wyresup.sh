#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

export PORT=5195
while true; do
  echo "[$(date)] Starting WyreSup server on port 5195..." >> server.log
  node server.js >> server.log 2>&1
  echo "[$(date)] WyreSup server stopped, restarting in 2s..." >> server.log
  sleep 2
done
