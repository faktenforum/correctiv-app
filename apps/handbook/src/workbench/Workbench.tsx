import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import type { Appearance } from '../theme';
import { install, NO_FRAME, readFrame, registerFrame, statusOf, type FrameInfo } from './api';
import { attachConsole } from './frame/console';
import { applyTheme, BASE, frameRoute, navigate } from './frame/handle';
import { armPicker, openInEditor, type Located } from './frame/locate';
import { audit, setOutline, type Finding } from './frame/measure';
import { waitReady } from './frame/ready';
import { applyFixture } from './frame/seed';
import { apply as applyTokens, type Scheme } from './frame/tokens';
import { addLog, clearLogs, getLogs, subscribeLogs } from './logs';
import { frameSize, type PreviewState } from './state';
import { getState, set, start, subscribe } from './store';
import { Panels, type ToolBindings } from './ui/Panels';
import { Readout } from './ui/Readout';
import { Stage } from './ui/Stage';
import { Toolbar } from './ui/Toolbar';

/**
 * Read the address bar once, and only once the workbench is actually on screen.
 *
 * `start()` writes the parsed state straight back with `replaceState`, so calling
 * it at module scope would rewrite the URL of whatever page the reader happened
 * to open, and `install()` would put `window.preview` on every one of them. The
 * flag is because StrictMode renders twice in development and `start()` would
 * otherwise add a second `hashchange` listener.
 */
let started = false;

function startOnce(): true {
  if (!started) {
    started = true;
    start();
    install();
  }
  return true;
}

/**
 * The site's appearance is passed in rather than read here.
 *
 * `App.tsx` owns `useAppearance()` and the `data-theme` attribute it stamps. A
 * second call in this subtree would be a second copy of that state, and the copy
 * in `App.tsx` would go stale the moment this one wrote, putting the previous
 * theme back over the reader's choice on the way out of this route.
 */
export function Workbench({
  appearance,
  onAppearance,
}: {
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
}) {
  useState(startOnce);

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

  const size = frameSize(state);
  const scale = useScale(stageRef, size, state.zoom);

  const status = statusOf(state, frameInfo, reportedRoute, logs);

  useEffect(() => {
    registerFrame(frameRef.current);
  }, []);

  /**
   * The frame's first navigation, and every one the route field causes.
   *
   * A fixture has to be in storage before the app boots, so it is written here
   * rather than in an effect of its own: same-origin means this page's
   * `localStorage` IS the app's, and the app reads it while mounting.
   */
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // No fixture means leave the storage alone, which is what the plain demo
    // asks for: `preview.html` with no `s` is the link `README.md` hands out,
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
  }, [state.route, state.seed]);

  /** The appearance setting, re-applied after every load because a reload resets it. */
  useEffect(() => {
    if (state.theme) applyTheme(win(), state.theme);
  }, [state.theme, loaded]);

  useEffect(
    () => applyTokens(win(), state.overrides, textPass),
    [state.overrides, textPass, loaded],
  );
  useEffect(() => setOutline(win(), outline), [outline, loaded]);

  // `#/?check=1` runs the checks by itself once the frame settles, so a finding
  // is reachable by opening a link rather than by clicking a button — the same
  // reason the device and the route live in the address bar.
  useEffect(() => {
    if (state.check && loaded > 0) setReport(audit(win()));
  }, [state.check, loaded]);

  useEffect(() => {
    if (!picking) return;
    return armPicker(win(), (frames, label) => {
      setHit({ label, frames });
      setSelected(0);
      setPicking(false);
    });
  }, [picking, loaded]);

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
  }, []);

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

  return (
    // Four rows, as the stylesheet's `.workbench` grid expects: the bar, the
    // link line, the split, and the readout. The two switches it keys on ride
    // this element rather than `<body>`, which belongs to the site: this is one
    // route of it, and a page that stamps the document leaks into every page the
    // reader visits next.
    <div
      className="workbench"
      data-tools={state.tools ? 'on' : 'off'}
      data-build={status.handle ? 'dev' : 'static'}
    >
      <Toolbar
        state={state}
        status={status}
        routeField={routeField}
        onRouteField={setRouteField}
        onChange={onChange}
        onReload={() => win()?.location.reload()}
        onRaw={() => window.open(BASE + (state.route || '/'), '_blank', 'noopener')}
        appearance={appearance}
        onAppearance={onAppearance}
      />
      {/*
        The split, and the row that takes the height left over. The skip link's
        target is here rather than on the grid above it, so it lands on the same
        landmark it lands on everywhere else on the site.
      */}
      <main id="content">
        <Stage
          state={state}
          scale={scale}
          stageRef={stageRef}
          frameRef={frameRef}
          onResize={onResize}
          onLoad={onLoad}
        />
        {/*
          Mounted whether or not the tools are on, and hidden by the stylesheet
          under `.workbench[data-tools='off']`. The switch between the two
          audiences is a column appearing beside the frame, and a transition
          needs both ends of itself to exist: unmounting the dock would make the
          demo and the workbench two different pages rather than one page with a
          drawer, which is the thing the design is careful about.
        */}
        <Panels
          state={state}
          status={status}
          logs={logs}
          tools={tools}
          onChange={onChange}
          onClearLogs={clearLogs}
        />
      </main>
      <Readout status={status} size={size} scale={scale} />
    </div>
  );
}

/**
 * The poll reads the frame three times a second, and almost always reads the
 * same four values. Comparing them keeps that from re-rendering the whole shell
 * at 3 Hz, which is enough to make the route field and the colour inputs stutter
 * under the person using them.
 */
function unchanged(a: FrameInfo, b: FrameInfo): boolean {
  return (
    a.handle === b.handle &&
    a.appTheme === b.appTheme &&
    a.scheme === b.scheme &&
    a.active === b.active
  );
}

/** Fit means "as large as the stage allows", so it depends on the stage, not the state. */
function useScale(
  stageRef: React.RefObject<HTMLDivElement | null>,
  size: { w: number; h: number },
  zoom: PreviewState['zoom'],
): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const compute = () => {
      if (zoom !== 'fit') return setScale(Number(zoom));
      const stage = stageRef.current;
      if (!stage) return;
      const availW = stage.clientWidth - 40 - 24; // padding plus room for the handles
      const availH = stage.clientHeight - 40 - 46; // padding plus the readout line
      setScale(Math.min(1, availW / size.w, availH / size.h));
    };
    compute();
    const observer = new ResizeObserver(compute);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [stageRef, size.w, size.h, zoom]);

  return scale;
}
