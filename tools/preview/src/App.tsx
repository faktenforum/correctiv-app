import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { combinationOf, readFrame, registerFrame, type Status } from './api';
import { attachConsole } from './frame/console';
import { applyTheme, BASE, frameRoute, navigate } from './frame/handle';
import { armPicker, openInEditor, type Located } from './frame/locate';
import { audit, schemeOf, setOutline, type Finding } from './frame/measure';
import { waitReady } from './frame/ready';
import { applyFixture } from './frame/seed';
import { apply as applyTokens, type Scheme } from './frame/tokens';
import { addLog, clearLogs, getLogs, subscribeLogs } from './logs';
import { frameSize, type PreviewState } from './state';
import { getState, set, subscribe } from './store';
import { Panels, type ToolBindings } from './ui/Panels';
import { Readout } from './ui/Readout';
import { Stage } from './ui/Stage';
import { Toolbar } from './ui/Toolbar';

export function App() {
  const state = useSyncExternalStore(subscribe, getState);
  const logs = useSyncExternalStore(subscribeLogs, getLogs);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const win = () => frameRef.current?.contentWindow ?? null;

  const [frameInfo, setFrameInfo] = useState({
    handle: false,
    appTheme: null as Status['appTheme'],
    scheme: null as Status['scheme'],
    active: 'light' as Scheme,
    route: undefined as string | undefined,
  });
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
  /** Bumped on every load, so everything injected into the frame is re-injected. */
  const [loaded, setLoaded] = useState(0);

  const size = frameSize(state);
  const scale = useScale(stageRef, size, state.zoom);

  const status: Status = {
    ...state,
    handle: frameInfo.handle,
    appTheme: frameInfo.appTheme,
    scheme: frameInfo.scheme,
    combination: combinationOf(frameInfo.appTheme, frameInfo.scheme),
    frameRoute: frameInfo.route,
    warnings: logs.filter((l) => l.level === 'warn').length,
    errors: logs.filter((l) => l.level === 'error').length,
  };

  // `window.preview` reads the live status through a ref, so installing it once
  // is enough and no caller is handed a stale snapshot.
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    registerFrame(frameRef.current, () => statusRef.current);
  }, []);

  /**
   * The frame's first navigation, and every one the route field causes.
   *
   * A fixture has to be in storage before the app boots, so it is written here
   * rather than in an effect of its own: same-origin means this page's
   * `localStorage` IS the app's, and the app reads it while mounting.
   */
  const seeded = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const reseed = seeded.current !== state.seed;
    if (reseed) {
      applyFixture(window.localStorage, state.seed);
      seeded.current = state.seed;
    }
    if (reseed || frameRoute(frame.contentWindow) !== state.route) {
      clearLogs();
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
      setPicking(false);
    });
  }, [picking, loaded]);

  const onLoad = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    attachConsole(frame.contentWindow, addLog);
    document.body.dataset.state = 'loading';

    void waitReady(frame).then(() => {
      const current = getState();
      if (current.theme) applyTheme(frame.contentWindow, current.theme);
      setLoaded((n) => n + 1);
      document.body.dataset.state = 'ready';
      return undefined;
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
      const route = frameRoute(current);
      const info = readFrame(current);
      setFrameInfo({ ...info, active: schemeOf(current), route });

      // The setting is re-asserted rather than set once. `persist()` hydrates
      // asynchronously and dispatches the stored theme, so a single dispatch at
      // load time is a race it can lose — and it did, in one of two otherwise
      // identical runs. Re-asserting settles it within a tick, whoever won.
      // While a setting is pinned in the URL, the app's own control cannot hold
      // against it; that is what pinning means.
      const wanted = getState().theme;
      if (wanted && info.appTheme && info.appTheme !== wanted) applyTheme(current, wanted);

      if (route !== undefined && route !== getState().route) {
        setRouteField(route);
        set({ route });
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => setRouteField(state.route), [state.route]);

  const onChange = useCallback((patch: Partial<PreviewState>) => set(patch), []);

  const tools: ToolBindings = {
    scheme: frameInfo.active,
    tokens: {
      overrides: state.overrides,
      set: (overrides) => set({ overrides }),
      textPass,
      setTextPass,
    },
    measure: { outline, setOutline: setOutlineOn, report, run: () => setReport(audit(win())) },
    inspect: { picking, setPicking, hit, open: (frame) => void openInEditor(frame) },
  };

  return (
    <>
      <Toolbar
        state={state}
        status={status}
        routeField={routeField}
        onRouteField={setRouteField}
        onChange={onChange}
        onReload={() => win()?.location.reload()}
        onRaw={() => window.open(BASE + (state.route || '/'), '_blank', 'noopener')}
      />
      {state.tools && (
        <Panels
          state={state}
          status={status}
          logs={logs}
          tools={tools}
          onChange={onChange}
          onClearLogs={clearLogs}
        />
      )}
      <Stage
        state={state}
        scale={scale}
        stageRef={stageRef}
        frameRef={frameRef}
        onResize={({ w, h }) => set({ device: 'custom', landscape: false, w, h })}
        onLoad={onLoad}
      />
      <Readout status={status} size={size} scale={scale} />
    </>
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
