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
 * Usage: node screens/tools/serve-clean.mjs [dir] [port] [--base=/correctiv-app]
 *
 * `--base` reproduces the other half of GitHub Pages: a project site is served from
 * a subdirectory, not a domain root, so an export built with EXPO_BASE_URL can only
 * be judged from underneath the same prefix. Without it a baseUrl build looks broken
 * locally and a root build looks fine — the exact reverse of what Pages does.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dir = positional[0] ?? 'dist';
const port = Number(positional[1] ?? 8099);
const baseArg = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? '';
const base = baseArg ? `/${baseArg.replace(/^\/+|\/+$/g, '')}` : '';

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

/** The request path with the Pages prefix removed, or undefined if it misses the prefix. */
function stripBase(url) {
  if (!base) return url;
  if (url === base) return '/';
  return url.startsWith(`${base}/`) ? url.slice(base.length) : undefined;
}

createServer((req, res) => {
  const pathname = stripBase(req.url ?? '/');
  const file = pathname === undefined ? undefined : resolveFile(pathname);
  if (!file) {
    // What GitHub Pages does with an unmatched path: serve 404.html — a copy of the
    // app shell, so the router resolves the URL client-side — and keep the 404
    // status, so a missing route is still visibly missing to anything that looks.
    const fallback = join(dir, '404.html');
    if (pathname !== undefined && existsSync(fallback)) {
      res.writeHead(404, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' });
      createReadStream(fallback).pipe(res);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`404 ${req.url}\n`);
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}${base}/`));
