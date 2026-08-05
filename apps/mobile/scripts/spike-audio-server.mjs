/**
 * Spike support server — stands in for the "separate Castopod behind secret auth
 * that only the app can talk to" from the feature scope.
 *
 * Serves the bundled sample episode at /audio.mp3 and REQUIRES
 * `Authorization: Bearer spike-token`. Without it: 401. That makes the header
 * test decisive — if playback works, the header demonstrably reached the server;
 * it cannot succeed by accident.
 *
 * Supports HTTP Range requests, because Android's MediaPlayer issues them and a
 * server that ignores Range makes seeking (and sometimes playback) fail for
 * reasons unrelated to auth.
 *
 * The emulator reaches the host at 10.0.2.2.
 *
 * Usage: node scripts/spike-audio-server.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] ?? 8099);
const TOKEN = 'spike-token';
const FILE = fileURLToPath(new URL('../src/assets/audio/sample-episode.mp3', import.meta.url));
const SIZE = statSync(FILE).size;

let requests = 0;

const server = createServer((req, res) => {
  requests += 1;
  const auth = req.headers.authorization ?? '(none)';
  const range = req.headers.range ?? '(none)';
  console.log(
    `[${requests}] ${req.method} ${req.url} | authorization=${auth} | range=${range} | ua=${req.headers['user-agent'] ?? '(none)'}`,
  );

  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (auth !== `Bearer ${TOKEN}`) {
    console.log(`      -> 401 (no valid Authorization header)`);
    res.writeHead(401, { 'content-type': 'text/plain' });
    res.end('unauthorized');
    return;
  }

  // Range support — MediaPlayer relies on it.
  const m = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (m) {
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : SIZE - 1;
    console.log(`      -> 206 ${start}-${end}/${SIZE}`);
    res.writeHead(206, {
      'content-type': 'audio/mpeg',
      'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${SIZE}`,
      'content-length': String(end - start + 1),
    });
    createReadStream(FILE, { start, end }).pipe(res);
    return;
  }

  console.log(`      -> 200 full body (${SIZE} bytes)`);
  res.writeHead(200, {
    'content-type': 'audio/mpeg',
    'accept-ranges': 'bytes',
    'content-length': String(SIZE),
  });
  createReadStream(FILE).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`spike audio server on http://0.0.0.0:${PORT}  (emulator: http://10.0.2.2:${PORT})`);
  console.log(`  /audio.mp3  requires  Authorization: Bearer ${TOKEN}`);
  console.log(`  ${FILE} (${SIZE} bytes)`);
});
