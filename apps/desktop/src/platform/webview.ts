// One fact about the web view that a LAYOUT has to know before the view exists.
//
// ## What it is
//
// On Windows `gi://WebKit` is `@gjsify/webview2-native`: Microsoft's WebView2 behind
// the same namespace (gjsify ADR 0035, stage 1). The page is a child window that the
// OS composites on top of the application, which buys input, focus and accessibility
// from the OS and costs clipping — it is not a node in GTK's scene graph. So anything
// drawn over it is drawn UNDER it.
//
// The backend says so itself, once, at map time. Measured on Windows 11 with the
// reader open:
//
//   WARNING **: WebKit(WebView2): this view is the main child of a GtkOverlay, so
//   anything overlaid on it will be drawn UNDER the web content instead of over it.
//   This view is an OS-composited overlay (WebKit.HostingMode.OVERLAY), not a node in
//   GTK's scene graph.
//
// On Linux (WebKitGTK) and macOS (`@gjsify/webkit-native`, whose widget renders
// offscreen and is presented as a `GdkTexture` in its `snapshot` vfunc) the view IS in
// the scene graph and an overlay works.
//
// ## Why it is a platform check and not a capability check
//
// The honest question is `view.get_hosting_mode()`, which is the backend's own answer
// and exists only where the condition does. But it can only be asked of a live
// `WebKit.WebView`, and the shim creates that inside an effect after the first layout
// pass — while the decision this file exists for has to be made while BUILDING that
// layout. A capability check that arrives one render too late is not a capability
// check.
//
// So it is `process.platform`, in exactly one place, with the trigger that removes it:
// ADR 0035 stage 2 puts the view into the scene graph through
// `Windows.Graphics.Capture`, and on the day that lands this file becomes a constant
// `false` and then nothing.
//
// ## Why it matters more than a cosmetic difference
//
// The reader's only way back is the button in its own floating header. Invisible, that
// screen is a dead end — measured: the GTK header bars above it carry no back action.
// So this is a functional break on one platform, not a styling difference, and it is
// why the reader lays its header out differently there rather than merely logging.

/**
 * Does the web view sit ON TOP of the application, outside GTK's scene graph?
 *
 * `true` means: do not overlay anything on it, do not put it in a `ScrolledWindow` or a
 * `Popover`, and do not expect opacity or a transform to reach it. Give it its own
 * rectangle — a full-page document under a header bar is the shape that works.
 */
export function webViewIsOsOverlay(): boolean {
  return process.platform === 'win32';
}
