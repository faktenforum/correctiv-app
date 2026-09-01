/**
 * Resolves when the frame has stopped moving.
 *
 * The shell used to have no such signal at all: `screens/README.md` says to shoot
 * the web set "waiting for the feeds to settle", and the thing doing the waiting
 * was a person. A screenshot fired at `load` catches an unstyled first paint, one
 * fired after a fixed timeout is a guess that gets slower every year.
 *
 * Three conditions, in order, because each can only be true after the last:
 * the document parsed, the webfonts decoded (Merriweather and Source Sans are
 * embedded, and text reflows when they land), and two animation frames of quiet
 * so the first render after hydration has been painted.
 *
 * It is not a promise that the network is finished — the feed cascade can still
 * be running, and `frame/seed.ts` is how you decide what it will find. It is a
 * promise that what is on screen is what this build paints.
 */
export async function waitReady(frame: HTMLIFrameElement): Promise<void> {
  const win = frame.contentWindow;
  if (!win) return;

  if (win.document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      frame.addEventListener('load', () => resolve(), { once: true });
    });
  }

  try {
    await frame.contentDocument?.fonts?.ready;
  } catch {
    // A frame that navigated mid-wait has no document any more. Not a fault:
    // the next navigation will run this again.
  }

  await new Promise<void>((resolve) => {
    const raf = frame.contentWindow?.requestAnimationFrame ?? requestAnimationFrame;
    raf(() => raf(() => resolve()));
  });
}
