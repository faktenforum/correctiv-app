// Android system-bar colors (status bar top + navigation/gesture bar bottom).
//
// The top status bar can be colored via NativeScript's built-in Page properties
// (`androidStatusBarBackground` + `statusBarStyle`). Core has NO property for the
// bottom navigation bar, so we set it imperatively here. Both rely on the classic
// setStatusBarColor/setNavigationBarColor APIs, which only take effect because the
// app targets SDK 34 (on targetSdk 35 / Android 15+ the bars are forced transparent).
//
// Calls are guarded: the foreground activity may be briefly unavailable at startup,
// so callers retry until a setter reports success.
import { Application } from '@nativescript/core';

declare const androidx: any;

export const BRAND_RED = '#ff5064';

function getWindow(): any | null {
  try {
    const activity = Application.android?.foregroundActivity ?? Application.android?.startActivity;
    return activity ? activity.getWindow() : null;
  } catch {
    return null;
  }
}

function ensureDrawsBarBackgrounds(window: any): void {
  const LP = android.view.WindowManager.LayoutParams;
  window.clearFlags(LP.FLAG_TRANSLUCENT_STATUS | LP.FLAG_TRANSLUCENT_NAVIGATION);
  window.addFlags(LP.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
}

function iconController(window: any): any | null {
  try {
    return androidx.core.view.WindowCompat.getInsetsController(window, window.getDecorView());
  } catch {
    return null;
  }
}

/** Color a specific window's bottom navigation bar + icon brightness.
 *  Use this for modals: their own (dialog) window is NOT the activity window, so
 *  the activity window's nav color is not visible — get the modal's window via
 *  `page.getClosestWindow()` and pass it here.
 *  `lightIcons: true` => white icons (use on dark/colored backgrounds). */
export function setNavBarOnWindow(window: any, colorHex: string, lightIcons: boolean): void {
  if (!__ANDROID__ || !window) return;
  try {
    ensureDrawsBarBackgrounds(window);
    window.setNavigationBarColor(android.graphics.Color.parseColor(colorHex));
    const c = iconController(window);
    if (c) c.setAppearanceLightNavigationBars(!lightIcons); // appearanceLight = dark icons
  } catch (err) {
    console.error('[system-bars] setNavBarOnWindow failed:', err);
  }
}

/** Color the foreground activity's navigation bar (the main app, not modals). */
export function setNavBar(colorHex: string, lightIcons: boolean): boolean {
  if (!__ANDROID__) return true;
  const window = getWindow();
  if (!window) return false;
  setNavBarOnWindow(window, colorHex, lightIcons);
  return true;
}

/** Set both bars (color + icon brightness) in one call — used for the app default. */
export function applyBars(statusColor: string, navColor: string, lightIcons: boolean): boolean {
  if (!__ANDROID__) return true;
  const window = getWindow();
  if (!window) return false;
  try {
    ensureDrawsBarBackgrounds(window);
    const Color = android.graphics.Color;
    window.setStatusBarColor(Color.parseColor(statusColor));
    window.setNavigationBarColor(Color.parseColor(navColor));
    const c = iconController(window);
    if (c) {
      c.setAppearanceLightStatusBars(!lightIcons);
      c.setAppearanceLightNavigationBars(!lightIcons);
    }
    return true;
  } catch (err) {
    console.error('[system-bars] applyBars failed:', err);
    return false;
  }
}

// App default: light theme => white bars + dark icons; dark theme => dark bars + light icons.
// (#ffffff = bg-grey-100, #1a1a1a = $d-page from dark.scss.)
export function applyThemeDefault(dark: boolean): boolean {
  return dark ? applyBars('#1a1a1a', '#1a1a1a', true) : applyBars('#ffffff', '#ffffff', false);
}

export function setNavBarThemeDefault(dark: boolean): boolean {
  return dark ? setNavBar('#1a1a1a', true) : setNavBar('#ffffff', false);
}
