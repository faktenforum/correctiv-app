#!/usr/bin/env bash
# Deterministisches Deploy auf den Android-Emulator.
# Umgeht zwei Fallen: Zombie-Watch-Prozesse und stale Bundles nach Build-Fehlern
# (die NS-CLI synct sonst kommentarlos den alten Stand).
set -euo pipefail
cd "$(dirname "$0")/.."

pkill -f "[n]s run android" 2>/dev/null || true
pkill -f "[v]ite" 2>/dev/null || true
sleep 1

echo "── Vite-Build …"
npx vite build --mode=development -- --env.android > /tmp/vite-build.log 2>&1 || {
  echo "BUILD FEHLGESCHLAGEN:"; tail -20 /tmp/vite-build.log; exit 1;
}
if [ -z "$(find .ns-vite-build/bundle.mjs -newermt '-60 seconds' 2>/dev/null)" ]; then
  echo "STALE BUNDLE — bundle.mjs wurde nicht neu geschrieben:"; tail -20 /tmp/vite-build.log; exit 1;
fi
grep -E "error TS" /tmp/vite-build.log | head -5 || true

echo "── Deploy …"
timeout 240 ns run android --no-hmr > /tmp/nsrun.log 2>&1 &
NS_PID=$!
for i in $(seq 1 46); do
  sleep 5
  if grep -q "Successfully synced" /tmp/nsrun.log 2>/dev/null; then
    echo "SYNCED"
    sleep 6
    kill "$NS_PID" 2>/dev/null || true
    pkill -f "[n]s run android" 2>/dev/null || true
    exit 0
  fi
  if grep -qE "enough storage|BUILD FAILED" /tmp/nsrun.log 2>/dev/null; then
    echo "DEPLOY FEHLGESCHLAGEN:"; tail -5 /tmp/nsrun.log
    kill "$NS_PID" 2>/dev/null || true
    exit 1
  fi
done
echo "TIMEOUT beim Sync:"; tail -5 /tmp/nsrun.log; exit 1
