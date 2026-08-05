#!/usr/bin/env bash
# Second pass over the Expo build: the pushed routes, reached by deep link rather
# than by tapping. `correctiv://<route>` hits the screen directly, so these steps
# cannot drift when a layout changes — and they cover the routes no tab leads to.
#
#   OUT=out/expo bash tour-android-routes.sh
set -uo pipefail
A="${ANDROID_HOME}/platform-tools/adb"
OUT="${OUT:-out/expo}"
mkdir -p "$OUT"

shot() { $A exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
open() { $A shell am start -a android.intent.action.VIEW -d "correctiv://$1" >/dev/null 2>&1; sleep "${2:-5}"; }
scroll() { for _ in $(seq 1 "${1:-1}"); do $A shell input swipe 540 1900 540 700 260; sleep 0.7; done; sleep 0.5; }

open "artikel?url=$(python3 -c "import urllib.parse;print(urllib.parse.quote('https://correctiv.org/2026/08/05/barrieren-dialog-gemeinsam-barrieren-erkennen-wandel-ermoeglichen/'))" )" 8
shot 22-reader
scroll 3; shot 23-reader-mid

open "player" 4;        shot 82-player
open "video" 6;         shot 83-video
open "backstage" 4;     shot 90-backstage
open "beitreten" 4;     shot 70-join-1
open "einstellungen" 4; shot 91-einstellungen
open "gespeichert" 3;   shot 92-gespeichert
open "faktenforum" 5;   shot 93-faktenforum
open "atlas" 5;         shot 94-atlas
open "suche" 3;         shot 95-suche
open "bericht" 3;       shot 96-bericht
echo done
