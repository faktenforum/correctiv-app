/**
 * The `gi://` ambient declarations for the two libraries this host loads dynamically.
 *
 * `@girs/*` ships a `*-ambient.d.ts` per library declaring `gi://Name?version=X`, and it
 * is only in scope if something references it. `Gtk`, `Adw` and `GLib` arrive through
 * `@gjsify/gtk-host`'s own types; `Gst` and `WebKit` are this host's alone, so they are
 * referenced here.
 */
import '@girs/gst-1.0/ambient';
import '@girs/webkit-6.0/ambient';

/**
 * Metro defines `__DEV__`; this build defines it too (`--define '__DEV__=false'` in the
 * build script, which is what stopped `lib/store/core.ts` from throwing
 * `ReferenceError: __DEV__ is not defined` at startup). Declared so `tsc` agrees with
 * the bundler.
 */
declare global {
  const __DEV__: boolean;
}
