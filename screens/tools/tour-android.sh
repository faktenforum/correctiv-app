#!/usr/bin/env bash
# Walks a build on a running Android emulator and screenshots every step.
#
# One script for both apps, because the tours have to be comparable: the Expo and
# the NativeScript build differ only in the activity that starts them and in where
# the PNGs go. Both share the package id, so only one can be installed at a time.
#
#   OUT=out/expo         bash tour-android.sh
#   OUT=out/nativescript ACTIVITY=com.tns.NativeScriptActivity bash tour-android.sh
#
# Requires: $ANDROID_HOME, a booted emulator (with a window — headless dies on
# SELinux denying execheap to SwiftShader's shader JIT), and the app installed.
set -uo pipefail
A="${ANDROID_HOME}/platform-tools/adb"
PKG=org.correctiv.app.prototype
OUT="${OUT:-out/expo}"
mkdir -p "$OUT"

shot() { $A exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
back() { $A shell input keyevent 4; sleep 1.4; }
scroll() { for _ in $(seq 1 "${1:-1}"); do $A shell input swipe 540 1900 540 700 260; sleep 0.7; done; sleep 0.6; }
top() { for _ in $(seq 1 6); do $A shell input swipe 540 700 540 2000 220; done; sleep 1; }

# Taps an element found by content-desc or text. React Native's
# accessibilityLabel arrives on Android as content-desc, which is why the app sets
# it explicitly on every pressable.
tap() {
  local label="$1" coords
  $A shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  coords=$($A shell cat /sdcard/ui.xml 2>/dev/null | python3 - "$label" <<'PY'
import re, sys
label = sys.argv[1]
xml = sys.stdin.read()
best = None
for match in re.finditer(r'<node[^>]*>', xml):
    tag = match.group(0)
    values = [m.group(1) for m in (re.search(r'content-desc="([^"]*)"', tag),
                                   re.search(r'text="([^"]*)"', tag)) if m and m.group(1)]
    if not any(label == v or label in v for v in values):
        continue
    bounds = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', tag)
    if not bounds:
        continue
    x1, y1, x2, y2 = map(int, bounds.groups())
    area = (x2 - x1) * (y2 - y1)
    # The smallest match is the label itself, not the container around it.
    if area > 0 and (best is None or area < best[0]):
        best = (area, (x1 + x2) // 2, (y1 + y2) // 2)
print(f"{best[1]} {best[2]}" if best else "")
PY
  )
  if [ -z "$coords" ]; then echo "  MISS $label"; return 1; fi
  $A shell input tap $coords
  echo "  tap $label"
  sleep 1.4
}

# Every label on screen — run this when a tour step stops finding its target.
labels() {
  $A shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  $A shell cat /sdcard/ui.xml 2>/dev/null | python3 -c '
import re, sys
xml = sys.stdin.read()
seen, out = set(), []
for m in re.finditer(r"(?:text|content-desc)=\"([^\"]+)\"", xml):
    v = m.group(1).strip()
    if v and v not in seen and len(v) <= 44:
        seen.add(v); out.append(v)
print("  labels: " + " | ".join(out))'
}

# A cleared app starts at onboarding, which is where the draft's tour starts too.
$A shell pm clear "$PKG" >/dev/null
$A shell am start -n "$PKG/${ACTIVITY:-.MainActivity}" >/dev/null
sleep 9

shot 01-onboarding-welcome
tap "Los geht’s";                         shot 02-onboarding-interests
tap Klima; tap Faktenchecks; tap Weiter;  shot 03-onboarding-push
tap Weiter; sleep 2;                      shot 04-onboarding-club
tap "Erstmal umsehen"; sleep 6;           shot 10-home-top
scroll 2;                                 shot 11-home-mid
scroll 2;                                 shot 12-home-bottom
scroll 3;                                 shot 13-home-end
top
tap Entdecken; sleep 2;                   shot 30-entdecken
scroll 2;                                 shot 31-entdecken-mid
tap Mediathek; sleep 3;                   shot 40-mediathek
scroll 2;                                 shot 41-mediathek-mid
tap Mitmachen; sleep 2;                   shot 50-mitmachen
scroll 2;                                 shot 51-mitmachen-mid
tap Profil; sleep 2;                      shot 60-profil
scroll 2;                                 shot 61-profil-mid
echo done
