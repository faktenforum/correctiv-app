#!/usr/bin/env bash
# Deploy the design draft (design-entwurf/project) to the GitHub Pages web demo
# (app-prototype/docs). The demo IS the design draft: the .dc.html runtime
# (support.js) resolves <dc-import name="X"> -> ./X.dc.html and import('./content.js')
# at runtime via fetch(), so the modular design works as static GitHub Pages.
#
# Copies only the runtime files, renames the entry to index.html, and keeps a
# .nojekyll so GitHub Pages serves the dotfiles/underscored paths verbatim.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../../design-entwurf/project"   # sibling repo: Correctiv/design-entwurf
DEST="$HERE/../docs"

[ -d "$SRC" ] || { echo "Design source not found: $SRC" >&2; exit 1; }
mkdir -p "$DEST"

# Remove ONLY what this script deploys. It used to wipe everything in $DEST
# except .nojekyll, which silently made docs/ unusable for anything else — the
# ADRs lived at docs/adr/ for a while and one demo deploy would have deleted them.
# They now live in adr/, but a deploy must not be able to destroy a sibling
# directory it knows nothing about.
rm -rf "$DEST"/css
rm -f "$DEST"/*.dc.html "$DEST"/index.html "$DEST"/content.js "$DEST"/support.js \
  "$DEST"/image-slot.js "$DEST"/ios-frame.jsx "$DEST"/.image-slots.state.json

# Screen/overlay components + main entry.
cp "$SRC"/*.dc.html "$DEST"/
rm -f "$DEST/Correctiv App (inline backup).dc.html"   # old monolithic backup — not deployed
mv "$DEST/Correctiv App.dc.html" "$DEST/index.html"   # GitHub Pages entry point

# Runtime scripts + data + styles.
cp "$SRC"/content.js "$SRC"/support.js "$SRC"/image-slot.js "$SRC"/ios-frame.jsx "$DEST"/
cp "$SRC"/.image-slots.state.json "$DEST"/
cp -r "$SRC"/css "$DEST"/

touch "$DEST/.nojekyll"

echo "Deployed design draft -> $DEST"
ls -1 "$DEST"
