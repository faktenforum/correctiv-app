// Serves the board description to the running plugin.
//
// The plugin is an interpreter: its code never changes, only `spec.json` does. This
// server hands that file out and reports its mtime as a generation counter, so the
// plugin can poll something cheap and only fetch the whole document when it actually
// changed. Edit spec.json, save, and the board redraws — no clicking, no re-import,
// and no code crossing the wire.
//
//   node tools/figma-plugin/server.mjs
//
// Binds 127.0.0.1 AND [::1], because Chromium may resolve `localhost` to either.
// The manifest allows `http://localhost:8787`; Figma rejects a bare IP there.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = join(HERE, 'spec.json');
const PORT = Number(process.env.FIGMA_SPEC_PORT ?? 8787);

// The plugin's UI runs on null-origin, so it needs CORS to reach us at all.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { ...CORS, 'Content-Type': type });
  res.end(body);
}

async function generation() {
  const info = await stat(SPEC);
  return Math.round(info.mtimeMs);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  try {
    if (req.url === '/generation') {
      send(res, 200, JSON.stringify({ generation: await generation() }));
      return;
    }

    if (req.url === '/spec') {
      const text = await readFile(SPEC, 'utf8');
      JSON.parse(text); // fail here rather than in the plugin
      send(res, 200, JSON.stringify({ generation: await generation(), spec: JSON.parse(text) }));
      return;
    }

    if (req.url === '/report' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      // The plugin's own account of what it drew. This is the only feedback channel
      // that does not need a screenshot, so it is worth printing in full.
      console.log(new Date().toISOString().slice(11, 19), body);
      send(res, 200, '{"ok":true}');
      return;
    }

    send(res, 404, '{"error":"not found"}');
  } catch (error) {
    // A broken spec.json is the expected failure here, and the plugin should hear
    // about it rather than silently keep the last good board.
    send(res, 500, JSON.stringify({ error: String(error && error.message) }));
  }
});

// Both loopbacks, because the plugin fetches http://localhost:8787 and Chromium may
// resolve that to ::1 before 127.0.0.1. Binding the name itself would pick only one.
// Nothing beyond loopback is bound, so this stays off the network.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`spec server on http://127.0.0.1:${PORT} serving ${SPEC}`);
});

const server6 = createServer(server.listeners('request')[0]);
server6.on('error', (error) => {
  if (error.code !== 'EAFNOSUPPORT' && error.code !== 'EADDRNOTAVAIL') throw error;
  console.log('no IPv6 loopback; IPv4 only');
});
server6.listen(PORT, '::1', () => {
  console.log(`spec server on http://[::1]:${PORT}`);
});
