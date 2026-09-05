import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  install,
  NO_FRAME,
  readFrame,
  registerFrame,
  statusOf,
  uninstall,
  type FrameInfo,
} from './api';
import { attachConsole } from './frame/console';
import { applyTheme, BASE, frameRoute, navigate } from './frame/handle';
import { armPicker, openInEditor, type Located } from './frame/locate';
import { audit, setOutline, type Finding } from './frame/measure';
import { waitReady } from './frame/ready';
import { applyFixture } from './frame/seed';
import { apply as applyTokens, type Scheme } from './frame/tokens';
import { addLog, clearLogs, getLogs, subscribeLogs } from './logs';
import { HOST_DEVICE } from './devices';
import { frameSize, type PreviewState } from './state';
import { getState, set, start, subscribe } from './store';
import type { ToolBindings } from './ui/Panels';

/**
 * Everything the app view is, minus how it is arranged.
 *
 * A hook rather than a component because the pieces no longer sit together: the
 * controls are in the header's context bar, the frame is the main area, the
 * inspector is the right sidebar and the readout is the status line. They all
 * need the same state, and `App.tsx` is the only place that can hand it to all
 * four.
 *
 * The site's own appearance is deliberately not read here. `App.tsx` owns
 * `useAppearance()` and the class it stamps; a second call would be a second
 * copy of that state, and the copy in `App.tsx` would go stale the moment this
 * one wrote.
 *
 * `active` is every one of these effects' first condition. The hook is called on
 * every view because hooks are, but a shell that polled a frame that is not there
 * and wrote `#/?d=iphone-15-pro` over a document's heading anchor is what the
 * unconditional version did.
 */
export function useWorkbench(active: boolean) {
  const state = useSyncExternalStore(subscribe, getState);
  const logs = useSyncExternalStore(subscribeLogs, getLogs);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const win = () => frameRef.current?.contentWindow ?? null;

  const [frameInfo, setFrameInfo] = useState<FrameInfo>(NO_FRAME);
  const [reportedRoute, setReportedRoute] = useState<string | undefined>(undefined);
  const [routeField, setRouteField] = useState(state.route);

  // The overrides live in the URL with everything else: a proposed palette is
  // exactly the kind of thing worth handing to someone as a link. The text pass
  // is a way of looking, not part of the proposal, so it stays local.
  const [textPass, setTextPass] = useState(true);
  const [outline, setOutlineOn] = useState(false);
  const [report, setReport] = useState<{
    findings: Finding[];
    scheme: Scheme;
    scanned: number;
  } | null>(null);
  const [picking, setPicking] = useState(false);
  const [hit, setHit] = useState<{ label: string; frames: Located[] } | null>(null);
  /** The innermost frame is the usual answer, so it is the one preselected. */
  const [selected, setSelected] = useState(0);
  /** Bumped on every load, so everything injected into the frame is re-injected. */
  const [loaded, setLoaded] = useState(0);

  /*
   * `Stage` draws the device frame and the full-bleed frame as two different
   * subtrees, so switching between them replaces both the stage box and the
   * iframe. Every effect that holds one of those elements depends on this, or it
   * keeps measuring and messaging the element that was thrown away: that is how
   * the app came back blank at 0 × 0 the first time.
   */
  const shape = state.device === HOST_DEVICE ? 'host' : 'framed';

  const { size, scale } = useStage(stageRef, state, active, shape);

  const status = statusOf(state, frameInfo, reportedRoute, logs);

  /*
   * The address bar is taken on the way in and given back on the way out, and
   * `window.preview` goes up with it: an automation asking a page that is not
   * showing the app to change devices would be answering about nothing.
   */
  useEffect(() => {
    if (!active) return;
    install();
    const release = start();
    return () => {
      release();
      uninstall();
    };
  }, [active]);

  /*
   * Re-run whenever the stage changes shape, not only on load. `Stage` draws a
   * device frame and a full-bleed frame as two different subtrees, so switching
   * between them replaces the iframe element, and both this and the navigation
   * below would otherwise still be holding the one that was thrown away.
   */
  useEffect(() => {
    registerFrame(active ? frameRef.current : null);
  }, [active, loaded, shape]);

  /**
   * The frame's first navigation, and every one the route field causes.
   *
   * A fixture has to be in storage before the app boots, so it is written here
   * rather than in an effect of its own: same-origin means this page's
   * `localStorage` IS the app's, and the app reads it while mounting.
   */
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    const frame = active ? frameRef.current : null;
    if (!frame) return;

    // No fixture means leave the storage alone, which is what the plain demo
    // asks for: `/workbench` with no `s` is the link `RELEASE.md` hands out,
    // and it must not wipe what the last visit left behind on its way in.
    let reseed = false;
    if (state.seed !== null && seeded.current !== state.seed) {
      applyFixture(window.localStorage, state.seed);
      seeded.current = state.seed;
      reseed = true;
    }
    if (reseed || frameRoute(frame.contentWindow) !== state.route) {
      clearLogs();
      document.body.dataset.state = 'loading';
      navigate(frame, state.route);
    }
  }, [active, shape, state.route, state.seed]);

  /** The appearance setting, re-applied after every load because a reload resets it. */
  useEffect(() => {
    if (active && state.theme) applyTheme(win(), state.theme);
  }, [active, state.theme, loaded]);

  useEffect(
    () => applyTokens(win(), state.overrides, textPass),
    [state.overrides, textPass, loaded],
  );
  useEffect(() => setOutline(win(), outline), [outline, loaded]);

  // `#/?check=1` runs the checks by itself once the frame settles, so a finding
  // is reachable by opening a link rather than by clicking a button — the same
  // reason the device and the route live in the address bar.
  useEffect(() => {
    if (active && state.check && loaded > 0) setReport(audit(win()));
  }, [active, state.check, loaded]);

  useEffect(() => {
    if (!active || !picking) return;
    return armPicker(win(), (frames, label) => {
      setHit({ label, frames });
      setSelected(0);
      setPicking(false);
    });
  }, [active, picking, loaded]);

  const onLoad = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    attachConsole(frame.contentWindow, addLog);
    document.body.dataset.state = 'loading';

    void waitReady(frame).then(() => {
      setLoaded((n) => n + 1);
      document.body.dataset.state = 'ready';
      return undefined; // `promise/always-return`, which has nothing to be given here
    });
  }, []);

  /**
   * expo-router navigates with `pushState`, which fires no event an outer frame
   * can hear, so the route is polled. Cheap, and it also catches taps inside the
   * app — the field always shows where the frame actually is. The same tick
   * re-reads the handle and both schemes, which a person can change in DevTools
   * at any moment.
   */
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const current = win();

      // Also patched here, not only on load, because `load` is late: the app's
      // first render happens before it, and a React warning from that render is
      // exactly what this panel exists to catch. Attaching is idempotent.
      attachConsole(current, addLog);

      const info = readFrame(current);
      setFrameInfo((previous) => (unchanged(previous, info) ? previous : info));
      const route = frameRoute(current);
      setReportedRoute(route);

      // The setting is re-asserted rather than set once. `persist()` hydrates
      // asynchronously and dispatches the stored theme, so a single dispatch at
      // load time is a race it can lose — and it did, in one of two otherwise
      // identical runs. Re-asserting settles it within a tick, whoever won.
      // While a setting is pinned in the URL, the app's own control cannot hold
      // against it; that is what pinning means.
      const wanted = getState().theme;
      if (wanted && info.appTheme && info.appTheme !== wanted) applyTheme(current, wanted);

      if (route !== undefined && route !== getState().route) set({ route });
    }, 300);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => setRouteField(state.route), [state.route]);

  const onChange = useCallback((patch: Partial<PreviewState>) => set(patch), []);
  // Stable, because `Stage` re-attaches its drag handles whenever this changes.
  const onResize = useCallback(
    ({ w, h }: { w: number; h: number }) => set({ device: 'custom', landscape: false, w, h }),
    [],
  );

  const tools: ToolBindings = {
    scheme: frameInfo.active,
    tokens: {
      overrides: state.overrides,
      set: (overrides) => set({ overrides }),
      textPass,
      setTextPass,
    },
    measure: { outline, setOutline: setOutlineOn, report, run: () => setReport(audit(win())) },
    inspect: {
      picking,
      setPicking,
      hit,
      selected,
      setSelected,
      open: (frame) => void openInEditor(frame),
    },
  };

  return {
    state,
    status,
    logs,
    tools,
    scale,
    size,
    routeField,
    setRouteField,
    stageRef,
    frameRef,
    onChange,
    onResize,
    onLoad,
    onReload: () => win()?.location.reload(),
    onRaw: () => window.open(BASE + (state.route || '/'), '_blank', 'noopener'),
    clearLogs,
  };
}
function unchanged(a: FrameInfo, b: FrameInfo): boolean {
  return (
    a.handle === b.handle &&
    a.appTheme === b.appTheme &&
    a.scheme === b.scheme &&
    a.active === b.active
  );
}

/**
 * How big the frame is and how much it is scaled, both measured against the box.
 *
 * Two answers from one observer because they come from one measurement. `host`
 * takes the box itself as the size and is never scaled: it is the app at the
 * screen's size, which is the point of it, and a scale factor over that would be
 * a lie about how many pixels the app thinks it has.
 *
 * `active` is a dependency because it is what decides whether there is a box at
 * all. Arriving at the app view from another one, the ref goes from null to an
 * element without any of the other dependencies changing, so the observer was
 * never attached and the frame stayed at the initial 100%: correct on a direct
 * load of this address, wrong every time somebody clicked their way here.
 */
function useStage(
  stageRef: React.RefObject<HTMLDivElement | null>,
  state: PreviewState,
  active: boolean,
  shape: string,
): { size: { w: number; h: number }; scale: number } {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const asked = frameSize(state);
  const isHost = state.device === HOST_DEVICE;

  useLayoutEffect(() => {
    if (!active) return;
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const next = { w: stage.clientWidth, h: stage.clientHeight };
      setBox((previous) => (previous.w === next.w && previous.h === next.h ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [active, shape, stageRef]);

  // Full bleed: no padding to subtract and no handles to leave room for.
  if (isHost) return { size: box, scale: 1 };

  const size = asked;
  if (state.zoom !== 'fit') return { size, scale: Number(state.zoom) };

  // Padding on both sides plus room for the handles, which hang outside the frame.
  const availW = box.w - 40 - 24;
  const availH = box.h - 40 - 24;
  const scale = box.w === 0 ? 1 : Math.min(1, availW / size.w, availH / size.h);
  return { size, scale };
}
