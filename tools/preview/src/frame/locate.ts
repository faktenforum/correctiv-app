/**
 * Which line of which file drew the thing that was clicked.
 *
 * This is the bridge the whole shell exists for: a designer points at a card, and
 * what comes back is `src/components/feed/ArticleRow.tsx:42` — an instruction an
 * agent or a developer can act on, instead of a sentence describing a rectangle.
 *
 * How it works, because none of it is obvious. React 19 removed `_debugSource`,
 * so there is no field to read. What a development build does keep is
 * `_debugStack`: the JSX runtime creates an `Error` at every element's call site,
 * and `_debugOwner` chains those together. Walking that chain and formatting each
 * stack the way `react-dom` formats it internally yields one frame per level —
 * innermost the DOM node, outermost the screen. Those frames point into the Metro
 * bundle, not into source, so they go to Metro's own `/symbolicate`, which maps
 * them back and marks everything under `node_modules/` as collapsible. What
 * survives that filter is the app's own code.
 *
 * The whole thing is same-origin: `preview.html` is served by the Metro dev
 * server itself, so `/symbolicate` and `/open-stack-frame` are plain fetches.
 *
 * It works only against `npm run web`. A production bundle has no `_debugStack`,
 * and this returns nothing rather than guessing — the panel says which case it is.
 */
export interface Located {
  file: string;
  lineNumber: number;
  column: number;
  methodName: string | null;
}

interface Fiber {
  _debugOwner?: Fiber | null;
  _debugStack?: Error | null;
}

const AT_PAREN = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/; // V8
const AT_AT = /^\s*(?:(.*?)@)?(.+?):(\d+):(\d+)\s*$/; // SpiderMonkey, JavaScriptCore

/** The randomised expando react-dom stamps on every host node. */
function fiberOf(node: Element | null): Fiber | null {
  for (let n: Element | null = node; n; n = n.parentElement) {
    const key = Object.keys(n).find((k) => k.startsWith('__reactFiber$'));
    if (key) return (n as unknown as Record<string, Fiber>)[key] ?? null;
  }
  return null;
}

/**
 * `react-dom`'s own `formatOwnerStack`, re-implemented: drop the synthetic
 * header, drop the `jsx()` frame, stop at React's bottom frame. What is left
 * begins with the exact line that wrote this element.
 */
function ownerFrame(err: Error | null | undefined): string {
  if (!err?.stack) return '';
  let stack = err.stack;
  if (stack.startsWith('Error: react-stack-top-frame\n')) stack = stack.slice(29);
  const newline = stack.indexOf('\n');
  if (newline !== -1) stack = stack.slice(newline + 1);
  const bottom = stack.indexOf('react_stack_bottom_frame');
  if (bottom === -1) return ''; // past React's owner-stack budget, or too short a stack limit
  const cut = stack.lastIndexOf('\n', bottom);
  return cut === -1 ? '' : (stack.slice(0, cut).split('\n')[0] ?? '');
}

/** Metro wants an absolute bundle URL and a zero-based column. */
function toFrame(line: string): Located | null {
  const m = AT_PAREN.exec(line) ?? AT_AT.exec(line);
  if (!m) return null;
  const [, methodName, rawFile, lineNumber, column] = m;
  let file = rawFile!;
  if (file.startsWith('http')) {
    const url = new URL(file);
    if (!url.searchParams.has('platform')) url.searchParams.set('platform', 'web');
    if (!url.searchParams.has('dev')) url.searchParams.set('dev', 'true');
    file = url.toString();
  }
  return {
    file,
    lineNumber: Number(lineNumber),
    column: Number(column) - 1,
    methodName: methodName ?? null,
  };
}

export async function locate(win: Window | null, node: Element): Promise<Located[]> {
  if (!win) return [];

  // A longer limit keeps React's bottom frame inside the stack. Future renders only.
  try {
    (win as Window & typeof globalThis).Error.stackTraceLimit = 50;
  } catch {
    // Frozen or gone; the walk below simply finds fewer frames.
  }

  const lines: string[] = [];
  let fiber = fiberOf(node);
  for (let depth = 0; fiber && depth < 24; depth++) {
    const line = ownerFrame(fiber._debugStack);
    if (line) lines.push(line);
    fiber = fiber._debugOwner ?? null;
  }
  if (lines.length === 0) return [];

  const stack = lines.map(toFrame).filter((f): f is Located => f !== null);

  try {
    const response = await fetch('/symbolicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack }),
    });
    const body = (await response.json()) as { stack: (Located & { collapse?: boolean })[] };
    // Expo collapses every `node_modules/.+/` frame, so what is left is this app.
    return body.stack.filter((f) => !f.collapse);
  } catch {
    return []; // no Metro to ask: the static export, or the server is gone
  }
}

/** Expo's dev server mounts this; it opens the file in the editor. */
export async function openInEditor(frame: Located): Promise<void> {
  await fetch('/open-stack-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: frame.file, lineNumber: frame.lineNumber }),
  });
}

/** Re-armed after every navigation: the frame's document is replaced each time. */
export function armPicker(
  win: Window | null,
  onHit: (hits: Located[], label: string) => void,
): () => void {
  const doc = win?.document;
  if (!doc) return () => {};

  const onPointerDown = (event: Event) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return;
    event.preventDefault();
    event.stopPropagation();
    const label = (target.textContent ?? '').trim().slice(0, 40);
    void locate(win, target).then((hits) => onHit(hits, label));
  };

  doc.addEventListener('pointerdown', onPointerDown, { capture: true });
  return () => doc.removeEventListener('pointerdown', onPointerDown, { capture: true });
}
