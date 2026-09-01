import { useEffect, useRef, type RefObject } from 'react';

import { frameSize, type PreviewState } from '../state';

interface Props {
  state: PreviewState;
  scale: number;
  stageRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onResize: (size: { w: number; h: number }) => void;
  onLoad: () => void;
}

type Axes = 'x' | 'y' | 'xy';

/**
 * The frame, at the size of a device, and the handles that change that size.
 *
 * Why an iframe and not a web-only wrapper inside the app: inside the frame the
 * app's own `window` **is** the device. `useWindowDimensions`, media queries
 * (including the reader's 48rem breakpoint) and scroll behaviour all report the
 * simulated size. A wrapper in `_layout.tsx` would draw a phone frame while the
 * app still measured the desktop window, which is a preview that lies. It also
 * keeps every line of this out of the app bundle and the native builds.
 *
 * Nothing is injected into the frame for sizing, deliberately: measured at
 * 393px, the app reports `innerWidth` 393 and `clientWidth` 393, so no desktop
 * scrollbar is eating layout width and there is nothing to compensate for.
 */
export function Stage({ state, scale, stageRef, frameRef, onResize, onLoad }: Props) {
  const { w, h } = frameSize(state);
  const right = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const corner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handles: [RefObject<HTMLDivElement | null>, Axes][] = [
      [right, 'x'],
      [bottom, 'y'],
      [corner, 'xy'],
    ];
    const detach = handles.map(([ref, axes]) => drag(ref.current, axes, { w, h }, scale, onResize));
    return () => detach.forEach((off) => off());
  }, [w, h, scale, onResize]);

  return (
    <main className="stage" ref={stageRef}>
      <div className="fitbox" style={{ width: w * scale, height: h * scale }}>
        <div className="device" style={{ width: w, height: h, transform: `scale(${scale})` }}>
          {/*
            No `sandbox`, on purpose. The attribute's useful values would have to
            include `allow-same-origin` for this tool to work at all — reading the
            frame's route, its console and its store is the entire point — and
            `allow-same-origin` plus `allow-scripts` on a document from this very
            origin is a sandbox that sandboxes nothing. An attribute that only
            looks like a precaution is worse than none.
          */}
          {/* eslint-disable-next-line react/iframe-missing-sandbox */}
          <iframe
            className="app"
            ref={frameRef}
            title="App preview"
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={onLoad}
          />
        </div>
        <div className="handle right" ref={right} />
        <div className="handle bottom" ref={bottom} />
        <div className="handle corner" ref={corner} />
      </div>
    </main>
  );
}

/** Drag deltas are screen pixels; the frame is CSS pixels behind a `scale()`. */
function drag(
  handle: HTMLDivElement | null,
  axes: Axes,
  start: { w: number; h: number },
  scale: number,
  onResize: (size: { w: number; h: number }) => void,
): () => void {
  if (!handle) return () => {};

  const down = (ev: PointerEvent) => {
    ev.preventDefault();
    handle.setPointerCapture(ev.pointerId);
    document.body.classList.add('dragging');
    const from = { x: ev.clientX, y: ev.clientY };

    const move = (e: PointerEvent) => {
      const next = { ...start };
      if (axes.includes('x'))
        next.w = Math.max(240, Math.round(start.w + (e.clientX - from.x) / scale));
      if (axes.includes('y'))
        next.h = Math.max(320, Math.round(start.h + (e.clientY - from.y) / scale));
      onResize(next);
    };

    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      document.body.classList.remove('dragging');
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  };

  handle.addEventListener('pointerdown', down);
  return () => handle.removeEventListener('pointerdown', down);
}
