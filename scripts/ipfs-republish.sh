#!/bin/bash
# Republish the DCCP World Bot World HUD IPNS record.
# Reads the target CID from ipfs-state.json, ensures the kubo daemon is up,
# and republishes. Safe to run every 12h (IPNS records last ~24h).
# The kubo key lives in the repo at ~/workspace/.ipfs-dccp (never in chat/logs).
set -u
export IPFS_PATH="$HOME/workspace/.ipfs-dccp"
IPFS="$HOME/workspace/bin/ipfs"
STATE="$HOME/workspace/dccp-world/ipfs-state.json"
KEY="dccp-world-hud"
LOG="$HOME/workspace/dccp-world/ipfs-republish.log"

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

if [ ! -f "$STATE" ]; then log "SKIP: no ipfs-state.json yet (final publish pending)"; exit 0; fi
CID=$(python3 -c "import json;print(json.load(open('$STATE'))['cid'])")
# Ensure daemon is running
if ! "$IPFS" swarm peers >/dev/null 2>&1; then
  log "daemon down, starting"
  "$IPFS" daemon --enable-gc >/dev/null 2>&1 &
  for i in $(seq 1 30); do
    "$IPFS" swarm peers >/dev/null 2>&1 && break
    sleep 2
  done
fi
if OUT=$("$IPFS" name publish --key="$KEY" --lifetime=48h "/ipfs/$CID" 2>&1); then
  NAME=$(echo "$OUT" | grep -o 'k51[a-z0-9]*' | head -1)
  log "OK published $CID as $NAME"
else
  log "FAIL $OUT"
  exit 1
fi
