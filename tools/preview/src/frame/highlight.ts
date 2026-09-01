/**
 * Which element is under the cursor, and which one was picked.
 *
 * Without this the picker asks a person to aim at something and then tells them
 * nothing about what they hit, so a wrong hit is indistinguishable from a right
 * one until the file name in the panel turns out to be surprising. A frame around
 * the thing removes the guessing on both ends.
 *
 * Marked with an attribute and styled from one injected rule rather than by
 * writing `el.style`: React owns the `style` of everything it renders and a
 * re-render would drop the outline, while an attribute nothing in the app knows
 * about survives one.
 */
const STYLE_ID = 'preview-highlight';
const PICKED = 'data-preview-picked';
const HOVERED = 'data-preview-hover';

const CSS = `
[${PICKED}]{outline:2px solid #ff5064 !important;outline-offset:1px !important}
[${HOVERED}]{outline:1px dashed #ff5064 !important;outline-offset:1px !important}
`;

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
}

function only(doc: Document, attribute: string, node: Element | null): void {
  for (const previous of doc.querySelectorAll(`[${attribute}]`)) {
    previous.removeAttribute(attribute);
  }
  node?.setAttribute(attribute, '');
}

/** The element the pick landed on. Stays until the next pick. */
export function markPicked(win: Window | null, node: Element | null): void {
  const doc = win?.document;
  if (!doc) return;
  ensureStyle(doc);
  only(doc, PICKED, node);
  only(doc, HOVERED, null);
}

/** What a click would hit right now. Only while the picker is armed. */
export function markHovered(win: Window | null, node: Element | null): void {
  const doc = win?.document;
  if (!doc) return;
  ensureStyle(doc);
  only(doc, HOVERED, node);
}

export function clearHighlight(win: Window | null): void {
  const doc = win?.document;
  if (!doc) return;
  only(doc, PICKED, null);
  only(doc, HOVERED, null);
}
