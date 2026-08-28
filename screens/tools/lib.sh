# Shared helpers for the emulator tours. Sourced, not executed.
#
# Requires: $ANDROID_HOME, a booted emulator (with a window — headless dies on
# SELinux denying execheap to SwiftShader's shader JIT), and the app installed.
# Where these tools live. Set by bash when the tours source this file; the literal
# fallback is for sourcing it by hand from the repo root, e.g. under zsh, which has
# no BASH_SOURCE.
TOOLS_DIR="${TOOLS_DIR:-$(dirname "${BASH_SOURCE[0]:-screens/tools/lib.sh}")}"
A="${ANDROID_HOME}/platform-tools/adb"
PKG=org.correctiv.app.prototype
OUT="${OUT:-out/android}"
mkdir -p "$OUT"

shot() { $A exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
back() { $A shell input keyevent 4; sleep 1.4; }
scroll() { for _ in $(seq 1 "${1:-1}"); do $A shell input swipe 540 1900 540 700 260; sleep 0.7; done; sleep 0.6; }
top() { for _ in $(seq 1 6); do $A shell input swipe 540 700 540 2000 220; done; sleep 1; }

# Opens a route directly. Deep links cannot drift when a layout changes, and they
# reach the screens no tab leads to.
open_route() {
  $A shell am start -a android.intent.action.VIEW -d "correctiv://$1" >/dev/null 2>&1
  sleep "${2:-5}"
}

# The current UI tree, as XML.
ui_dump() {
  $A shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  $A shell cat /sdcard/ui.xml 2>/dev/null
}

# Taps an element found by content-desc or text.
tap() {
  local label="$1" coords
  coords=$(ui_dump | python3 "$TOOLS_DIR/find-node.py" "$label")
  if [ -z "$coords" ]; then echo "  MISS $label"; return 1; fi
  $A shell input tap $coords
  echo "  tap $label"
  sleep 1.4
}

# Every label on screen — run this when a tour step stops finding its target.
labels() {
  ui_dump | python3 -c '
import re, sys
xml = sys.stdin.read()
seen, out = set(), []
for m in re.finditer(r"(?:text|content-desc)=\"([^\"]+)\"", xml):
    v = m.group(1).strip()
    if v and v not in seen and len(v) <= 44:
        seen.add(v); out.append(v)
print("  labels: " + " | ".join(out))'
}
