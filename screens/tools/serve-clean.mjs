/**
 * Serves an Expo web export the way GitHub Pages does: `/artikel` resolves to
 * `artikel.html`, `/aufruf/wem-gehoert-die-stadt` to the generated file of that
 * name.
 *
 * This exists because the obvious alternative lies. `python3 -m http.server` maps
 * `/artikel` to nothing, the export's SPA fallback answers, and Expo Router renders
 * its unmatched-route page — which looks exactly like a broken route in the app.
 * Two rounds of verification were spent on that.
 *
 * Usage: node screens/tools/serve-clean.mjs [dir] [port]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

/** The first candidate that exists — the file itself, `<path>.html`, or a directory index. */
function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname.split('?')[0]))
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const candidates = rel === '' ? ['index.html'] : [rel, `${rel}.html`, join(rel, 'index.html')];
  for (const candidate of candidates) {
    const full = join(dir, candidate);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return undefined;
}

createServer((req, res) => {
  const file = resolveFile(req.url ?? '/');
  if (!file) {
    // Deliberately not the SPA fallback: a 404 has to be visible as a 404 here,
    // otherwise a missing route looks like a rendered one.
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`404 ${req.url}\n`);
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
