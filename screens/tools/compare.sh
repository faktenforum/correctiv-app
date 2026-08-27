#!/usr/bin/env bash
# Rebuilds screens/compare/ — the three-way strips the README shows.
#
# Order is draft · nativescript · expo, left to right, and that order is the point:
# the draft is the target, the NativeScript column is what the layout used to be,
# and the Expo column is what it is now.
#
# A strip is only built where all three sets have that step, which is why compare/
# holds ten files and expo/ holds twenty-nine. The draft is a fixed set (it moves
# only when the design does) and the NativeScript one is frozen at the last build
# that existed, so in practice this runs after re-shooting expo/.
#
# Each column is scaled to a width of 405; `+append` pads the shorter one, which is
# the draft (540x1174 against 540x1200) — hence the white background rather than
# whatever the format defaults to.
#
#   bash screens/tools/compare.sh
set -euo pipefail
cd "$(dirname "$0")/.."

built=0
for f in draft/*.webp; do
  step=$(basename "$f")
  [ -f "nativescript/$step" ] && [ -f "expo/$step" ] || continue
  magick "draft/$step" "nativescript/$step" "expo/$step" \
    -resize 405x -background white +append -quality 80 "compare/$step"
  echo "  $step"
  built=$((built + 1))
done
echo "$built strips in screens/compare/"
