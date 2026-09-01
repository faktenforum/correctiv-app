import type { Located } from './frame/locate';

/**
 * What a designer hands to an agent after pointing at something.
 *
 * The point of this file is that "make this bit different" is not actionable and
 * `Chip.tsx:31` alone is barely better. What makes it actionable is the pair: the
 * line to change, and **the address that puts that thing back on screen**. With
 * the second one an agent can look at what was meant before changing it, and look
 * again afterwards, which is the whole reason this shell keeps its state in a URL.
 *
 * Deliberately plain text. It is pasted into a chat by a person, so it has to
 * survive being pasted into a chat by a person.
 */
export interface Selection {
  /** The element's own text or accessibility label, as the picker read it. */
  label: string;
  /** The owner chain, innermost first, as `locate()` returned it. */
  frames: Located[];
  /** Which of them the person meant. "This chip" and "this chip row" differ. */
  selected: number;
  /** The shell's own address, which already carries route, device and appearance. */
  view: string;
}

/**
 * An absolute path from Metro, shortened to what someone would type.
 *
 * `/home/someone/projects/correctiv-app/apps/mobile/src/x.tsx` says one useful
 * thing and forty useless characters, and the useless part differs per machine,
 * which would make two people's notes about the same line look different.
 */
export function repoPath(file: string): string {
  return file.replace(/^.*?\/((?:apps|packages|tools)\/.*)$/, '$1');
}

export function frameLabel(frame: Located): string {
  return `${repoPath(frame.file)}:${frame.lineNumber}`;
}

/**
 * The same thing, for a 270px column. The full path goes in the row's `title`
 * and in the handover block; a row truncated to `apps/mobile/src/compone…` tells
 * a reader nothing, and every row truncates to the same thing.
 */
export function frameShort(frame: Located): string {
  const name = repoPath(frame.file).split('/').pop() ?? frame.file;
  return `${name}:${frame.lineNumber}`;
}

const CONTEXT_LINES = 3;

export function handover({ label, frames, selected, view }: Selection): string {
  const chosen = frames[selected] ?? frames[0];
  const context = frames.filter((_, i) => i !== (chosen ? frames.indexOf(chosen) : -1));

  const lines = [`Element: ${label ? `"${label}"` : '(no label)'}`];
  if (chosen)
    lines.push(
      `Source:  ${frameLabel(chosen)}${chosen.methodName ? ` · ${chosen.methodName}` : ''}`,
    );
  for (const [i, frame] of context.slice(0, CONTEXT_LINES).entries()) {
    lines.push(`${i === 0 ? 'Context:' : '        '} ${frameLabel(frame)}`);
  }
  lines.push(`View:    ${view}`);
  return lines.join('\n');
}
