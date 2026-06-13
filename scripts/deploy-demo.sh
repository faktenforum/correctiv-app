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

# Wipe previous deploy (keep .nojekyll).
find "$DEST" -mindepth 1 -maxdepth 1 ! -name '.nojekyll' -exec rm -rf {} +

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
