import { onMounted, watch, ref } from 'nativescript-vue';
import { Application } from '@nativescript/core';
import { useSettingsStore } from '../stores/settings';

// Increments on every ACTUAL appearance flip. CollectionView recycles its cells
// natively and does not re-apply CSS when the root class changes, so pages with a
// CollectionView bind this to `:key` to force a fresh render on theme change.
export const themeTick = ref(0);
let lastAppliedClass = '';

// Internal NativeScript members we use to drive the appearance class ourselves.
// Stable (core uses them for its own dark mode) but not in the public typings.
type AnyView = {
  cssClasses?: Set<string>;
  _getRootModalViews?: () => AnyView[];
};
type AppInternals = {
  getRootView?: () => AnyView | undefined;
  setAutoSystemAppearanceChanged?: (value: boolean) => void;
  // Core's own appearance applier: removes the other appearance classes and adds
  // `newClass` on the view AND the GLOBAL system css class set, bumps the CSS
  // selector version, and calls _onCssStateChange() — so descendant pages (incl.
  // navigated subpages in tab frames) re-match. A nested class swap can't.
  applyCssClass?: (view: AnyView, cssClasses: string[], newClass: string, skipCssUpdate?: boolean) => void;
};
const App = Application as unknown as AppInternals;
const APPEARANCE_CLASSES = ['ns-light', 'ns-dark'];

// True OS appearance. We must NOT call (get)systemAppearance() in this runtime —
// both dereference an undefined context (`getResources`) and throw. Instead we
// read what core already resolved: the ns-dark/ns-light class it put on the root
// view at startup, and keep it current from the systemAppearanceChanged event.
let osDark = false;
let osCaptured = false;
function captureOsFromRoot(): void {
  try {
    const cc = App.getRootView?.()?.cssClasses;
    if (!cc) return;
    if (cc.has('ns-dark')) {
      osDark = true;
      osCaptured = true;
    } else if (cc.has('ns-light')) {
      osDark = false;
      osCaptured = true;
    }
  } catch {
    /* ignore */
  }
}

function resolveDark(theme: string): boolean {
  return theme === 'dark' || (theme === 'system' && osDark);
}

// Apply the resolved appearance to the root view AND every open modal root via
// core's applyCssClass (view + global system classes + selector-version bump +
// _onCssStateChange) — the same path core's OS-driven dark mode uses to re-style
// every page at runtime.
function applyAppearance(dark: boolean): void {
  try {
    const cls = dark ? 'ns-dark' : 'ns-light';
    const root = App.getRootView?.();
    if (!root || typeof App.applyCssClass !== 'function') return;
    App.applyCssClass(root, APPEARANCE_CLASSES, cls);
    const modals = typeof root._getRootModalViews === 'function' ? root._getRootModalViews() : null;
    if (modals) for (const m of modals) App.applyCssClass(m, APPEARANCE_CLASSES, cls);
    if (cls !== lastAppliedClass) {
      lastAppliedClass = cls;
      themeTick.value += 1; // notify CollectionView pages to re-render
    }
  } catch {
    /* never let theming crash a render */
  }
}

let osListenerBound = false;
function bindOsListener(reapply: () => void): void {
  if (osListenerBound) return;
  osListenerBound = true;
  try {
    Application.on('systemAppearanceChanged', (args: { newValue?: string }) => {
      osDark = args?.newValue === 'dark';
      osCaptured = true;
      reapply();
    });
  } catch {
    /* systemAppearanceChanged unsupported on this platform/version */
  }
}

// Called once by the AppShell. Owns the appearance class app-wide and overrides
// the OS: dark.scss targets `.ns-dark <descendant>`, and core auto-applies the OS
// appearance to the root view — so when the phone is dark a nested ns-light can
// never win and the app stays dark even after the user picks light. We disable
// that auto-application and drive the class from the in-app setting on theme
// change AND OS change.
export function useThemeController(): void {
  const settings = useSettingsStore();
  try {
    App.setAutoSystemAppearanceChanged?.(false);
  } catch {
    /* ignore */
  }
  const apply = () => applyAppearance(resolveDark(settings.theme));
  bindOsListener(apply);
  watch(() => settings.theme, apply);
  // The root view isn't registered with Application yet when the AppShell mounts
  // (nativescript-vue mounts the component first), so getRootView() is null here.
  // Retry briefly until it's ready, then capture the OS appearance and apply.
  onMounted(() => {
    let tries = 0;
    const ready = () => {
      if (App.getRootView?.()) {
        if (!osCaptured) captureOsFromRoot();
        apply();
      } else if (tries++ < 40) {
        setTimeout(ready, 50);
      }
    };
    ready();
  });
}

// Called by each modal. Modals are shown as separate roots; re-assert the
// resolved appearance on the freshly-shown modal root once it mounts.
export function useThemeForModal(): void {
  const settings = useSettingsStore();
  onMounted(() => applyAppearance(resolveDark(settings.theme)));
}
