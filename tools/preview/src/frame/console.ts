/**
 * What the app said while it was being looked at.
 *
 * The blind spot this closes is specific: a screenshot shows a page that looks
 * finished while the console carries a React warning, a failed image or a
 * swallowed rejection. `TROUBLESHOOTING.md` is largely a list of faults that
 * survived a green build, and several of them announce themselves here and
 * nowhere else.
 *
 * Same-origin makes this a property assignment rather than a protocol: the
 * frame's `console` is an object this page can reach. The originals are always
 * called, so the browser's own DevTools sees exactly what it saw before.
 */
export type Level = 'error' | 'warn';

export interface LogEntry {
  id: number;
  level: Level;
  text: string;
  at: number;
}

const MARKER = '__previewPatched';
const LIMIT = 200;

let counter = 0;

function format(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .slice(0, 2000);
}

/**
 * Patches the frame's console and its two unhandled-failure paths.
 *
 * Returns a detach function, but note that a navigation replaces the frame's
 * global anyway, so the usual lifecycle is "attach on every load and forget".
 * The marker keeps a double attach from wrapping the wrapper.
 */
export function attachConsole(win: Window | null, onEntry: (entry: LogEntry) => void): () => void {
  if (!win) return () => {};

  let live = true;
  const emit = (level: Level, text: string) => {
    if (live && text) onEntry({ id: ++counter, level, text, at: Date.now() });
  };

  try {
    const target = (win as Window & typeof globalThis).console as Console & {
      [MARKER]?: boolean;
    };
    if (!target[MARKER]) {
      target[MARKER] = true;
      for (const level of ['error', 'warn'] as const) {
        const original = target[level].bind(target);
        target[level] = (...args: unknown[]) => {
          emit(level, format(args));
          original(...args);
        };
      }
    }

    win.addEventListener('error', (event) => {
      emit('error', event.message || String(event.error));
    });
    win.addEventListener('unhandledrejection', (event) => {
      emit('error', `Unhandled rejection: ${format([event.reason])}`);
    });
  } catch {
    // The frame navigated away mid-attach. The next load attaches again.
  }

  return () => {
    live = false;
  };
}

/** Keeps the list bounded; the interesting entry is almost always the newest. */
export function append(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  return [...entries, entry].slice(-LIMIT);
}
