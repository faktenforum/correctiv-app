import { useEffect, useRef, type RefObject } from 'react';

import { cn } from '../../lib/cn';
import { frameSize, type PreviewState } from '../state';

/** Shared by the three drag handles, which differ only in edge and cursor. */
const HANDLE =
  'absolute bg-transparent after:absolute after:inset-0 after:m-auto after:rounded-s after:bg-stroke-strong hover:after:bg-accent';

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
 *
 * The graph-paper ground is `stage-grid`, the one piece of decoration in
 * `styles/app.css`. It is there so the frame reads as a thing standing on a
 * surface rather than a white box on a white page, which is what it looked like
 * without it.
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
    <div
      ref={stageRef}
      className="stage-grid relative flex h-full min-h-0 flex-col items-center gap-s overflow-auto p-m"
    >
      <h2 className="sr-only">App frame</h2>

      <div className="relative shrink-0" style={{ width: w * scale, height: h * scale }}>
        {/*
          The ground behind the app while it boots. Only a pinned dark setting is
          known here without reading the frame, and reading the frame is the
          `Readout`'s job; guessing anything else would flash the wrong colour
          under the app on every load.

          `transformOrigin` is what makes the box above the right size: scaled
          from its own top left, the device covers exactly `w * scale` by
          `h * scale`, which is what the handles are then positioned against.
        */}
        <div
          className="overflow-hidden rounded-md border border-stroke-strong bg-white text-neutral-700 shadow-lg"
          data-app-scheme={state.theme === 'dark' ? 'dark' : undefined}
          style={{
            width: w,
            height: h,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/*
            No `sandbox`, on purpose. The attribute's useful values would have to
            include `allow-same-origin` for this tool to work at all, since
            reading the frame's route, its console and its store is the entire
            point, and `allow-same-origin` plus `allow-scripts` on a document
            from this very origin is a sandbox that sandboxes nothing. An
            attribute that only looks like a precaution is worse than none.
          */}
          {/* eslint-disable-next-line react/iframe-missing-sandbox */}
          <iframe
            className="block h-full w-full border-0 bg-transparent"
            ref={frameRef}
            title="App preview"
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={onLoad}
          />
        </div>
        {/*
          Pointer only, and deliberately not the sole way to change the size:
          the same numbers are in the toolbar, in two fields, whenever the device
          is the person's own.
        */}
        <div
          ref={right}
          className={cn(
            HANDLE,
            '-right-s top-0 h-full w-s cursor-ew-resize after:h-[2.625rem] after:w-[0.1875rem]',
          )}
        />
        <div
          ref={bottom}
          className={cn(
            HANDLE,
            '-bottom-s left-0 h-s w-full cursor-ns-resize after:h-[0.1875rem] after:w-[2.625rem]',
          )}
        />
        <div
          ref={corner}
          className={cn(
            HANDLE,
            '-bottom-s -right-s h-s w-s cursor-nwse-resize after:h-[0.4375rem] after:w-[0.4375rem]',
          )}
        />
      </div>

      {/*
        The sentence the demo audience gets, and the one the workbench does not.
        The stylesheet hides it under `.workbench[data-tools='on']` as well; it is
        written out of the tree here so the hint cannot be read out by a screen
        reader that ignores the attribute this page happens to carry.
      */}
      {!state.tools && (
        <p className="max-w-[34rem] text-center text-m text-on-canvas-muted">
          This is the app at device size. Pick a device or a route above; the link bar reproduces
          exactly what you see. The tools switch, top right, opens the workbench.
        </p>
      )}
    </div>
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
    // On this page's own root, not on `document.body`: the body belongs to the
    // site and a class left there would outlive the route.
    handle.closest('.workbench')?.setAttribute('data-dragging', 'true');
    const from = { x: ev.clientX, y: ev.clientY };

    const move = (e: PointerEvent) => {
      const next = { ...start };
      if (axes.includes('x'))
        next.w = Math.max(240, Math.round(start.w + (e.clientX - from.x) / scale));
      if (axes.includes('y'))
        next.h = Math.max(320, Math.round(start.h + (e.clientY - from.y) / scale));
      onResize(next);
    };

    // `pointercancel` as well as `pointerup`: a touch the browser takes over
    // (a scroll gesture, a call coming in) ends the drag without an up, and the
    // move listener left behind would then run a second time on the next drag.
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      handle.closest('.workbench')?.removeAttribute('data-dragging');
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  handle.addEventListener('pointerdown', down);
  return () => handle.removeEventListener('pointerdown', down);
}
