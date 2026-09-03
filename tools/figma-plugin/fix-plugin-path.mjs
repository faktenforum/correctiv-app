// Point figma-linux-next's plugin registration at a real directory.
//
// Importing a plugin goes through the XDG document portal, which grants access to the
// ONE file that was picked and mounts it under /run/user/<uid>/doc/<handle>. The app
// stores that handle as the plugin's path. A Figma plugin is always at least a
// manifest plus its main script, so the handle can never be enough: the manifest
// loads, and then the console says `Unable to load code`.
//
// This rewrites the stored path to the directory the files actually live in, which
// the sandbox may read anyway through xdg-documents. Run it with the app CLOSED —
// figma-linux-next writes settings.json on exit and would undo the change.
//
//   node tools/figma-plugin/fix-plugin-path.mjs [directory]
//
// Re-run after every re-import; an import always writes a fresh portal handle.

import { readFile, writeFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const SETTINGS = join(
  homedir(),
  '.var/app/app.borys.FigmaLinuxNext/config/figma-linux-next/settings.json',
);
const PLUGIN_ID = 'correctiv-wireframes-local';
const DEFAULT_DIR = join(homedir(), 'Dokumente/correctiv-figma-wireframes');

const dir = resolve(process.argv[2] ?? DEFAULT_DIR);

for (const file of ['manifest.json', 'code.js', 'ui.html']) {
  try {
    await access(join(dir, file));
  } catch {
    console.error(`missing ${file} in ${dir}`);
    process.exit(1);
  }
}

const settings = JSON.parse(await readFile(SETTINGS, 'utf8'));
const extensions = settings.app?.savedExtensions ?? [];
const target = extensions.find((e) => e.lastKnownPluginId === PLUGIN_ID);

if (target === undefined) {
  console.error(`no registration for ${PLUGIN_ID}; import the plugin once first`);
  process.exit(1);
}

if (target.path === dir) {
  console.log(`already pointing at ${dir}`);
  process.exit(0);
}

console.log(`was: ${target.path}`);
target.path = dir;
await writeFile(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
console.log(`now: ${target.path}`);
