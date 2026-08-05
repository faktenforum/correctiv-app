/**
 * Screenshots the design draft (docs/*.dc.html) screen by screen.
 *
 * The draft is one interactive app shell inside an iOS frame, so the only way to
 * reach a screen is to click through it — same as a user. Every step gets a PNG
 * clipped to the device frame, which makes it directly comparable to an
 * `adb screencap` of the built app.
 *
 * Usage: node dc-tour.mjs <url> <outDir> [--tour=path/to/tour.json]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
const outDir = process.argv[3];
const tourArg = process.argv.find((a) => a.startsWith('--tour='));
mkdirSync(outDir, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'dc-tour-'));
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--remote-debugging-port=9334',
  `--user-data-dir=${profile}`,
  '--no-sandbox',
  '--disable-gpu',
  '--window-size=520,1040',
  '--force-device-scale-factor=2',
  'about:blank',
]);
chrome.stderr.on('data', () => {});

async function devtoolsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await fetch('http://localhost:9334/json/list').then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('chrome devtools never came up');
}

const ws = new WebSocket(await devtoolsUrl());
await new Promise((r) => (ws.onopen = r));

let msgId = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    problems.push(`UNCAUGHT ${msg.params.exceptionDetails.exception?.description ?? ''}`.slice(0, 300));
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    problems.push(`ERROR ${msg.params.entry.text}`.slice(0, 300));
  }
};

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
  });
}
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'eval failed');
  return result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 480,
  height: 980,
  deviceScaleFactor: 2,
  mobile: true,
});
// The draft's theme defaults to "auto"; headless Chrome reports dark, the
// emulator screenshots are light. Pin light so the two are comparable.
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'light' }],
});
await send('Page.navigate', { url });
await wait(6000);

/** Clicks the smallest element whose trimmed text matches — the label, not its container. */
const CLICK_FN = `(needle) => {
  const hits = [...document.querySelectorAll('div,button,span,a,label,input')].filter((el) => {
    const t = (el.innerText || el.value || '').trim();
    return t === needle || (needle.endsWith('*') && t.startsWith(needle.slice(0, -1)));
  });
  if (!hits.length) return 'MISS';
  const target = hits.sort((a, b) => a.innerText.length - b.innerText.length)[0];
  target.scrollIntoView({ block: 'center' });
  target.click();
  return 'OK';
}`;

/** The device frame: the element sized like the hinted 402x874 iOS viewport. */
async function frameClip() {
  return await evaluate(`(() => {
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 320 || r.width > 460 || r.height < 700 || r.height > 1000) continue;
      if (!best || r.height > best.height) best = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return best;
  })()`);
}

/** Short leaf texts — i.e. the labels the next tour step can click. */
async function labels() {
  return await evaluate(`(() => {
    const out = new Set();
    for (const el of document.querySelectorAll('div,button,span,a')) {
      if (el.children.length) continue;
      const t = (el.innerText || '').trim();
      if (t && t.length <= 26) out.add(t);
    }
    return [...out].join(' | ');
  })()`);
}

async function shot(name) {
  const clip = await frameClip();
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
  });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  return clip;
}

const tour = tourArg
  ? JSON.parse(readFileSync(tourArg.slice('--tour='.length), 'utf8'))
  : [{ name: 'initial', clicks: [] }];

const log = [];
for (const step of tour) {
  for (const needle of step.clicks ?? []) {
    const outcome = await evaluate(`(${CLICK_FN})(${JSON.stringify(needle)})`);
    log.push(`click ${JSON.stringify(needle)} -> ${outcome}`);
    await wait(step.pause ?? 700);
  }
  for (const [fx, fy] of step.tapAt ?? []) {
    const clip = await frameClip();
    const [x, y] = [clip.x + fx, clip.y + fy];
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    log.push(`tap ${fx},${fy} (page ${Math.round(x)},${Math.round(y)})`);
    await wait(step.pause ?? 700);
  }
  if (step.scrollY !== undefined) {
    // The screen containers carry data-screen-label; overlays (DetailLayer etc.)
    // do not, so fall back to the tallest scrollable box for those.
    const where = await evaluate(`(() => {
      const labelled = [...document.querySelectorAll('[data-screen-label]')].filter((el) => el.offsetParent);
      const scrollable = [...document.querySelectorAll('div')].filter(
        (el) => el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 300 && el.offsetParent,
      );
      const box = labelled.find((el) => el.scrollHeight > el.clientHeight + 40)
        ?? scrollable.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (!box) return 'NO SCROLLER';
      box.scrollTop = ${step.scrollY};
      return box.getAttribute('data-screen-label') ?? 'overlay';
    })()`);
    log.push(`scroll ${step.scrollY} in ${where}`);
    await wait(600);
  }
  const clip = await shot(step.name);
  log.push(`shot ${step.name} clip=${clip ? `${Math.round(clip.width)}x${Math.round(clip.height)}` : 'full'}`);
  if (step.labels) log.push(`  labels: ${await labels()}`);
}

console.log(log.join('\n'));
if (problems.length) console.log('\nPAGE PROBLEMS:\n' + [...new Set(problems)].join('\n'));
ws.close();
chrome.kill();
