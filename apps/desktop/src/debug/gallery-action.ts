// A way into the component gallery from the running window.
//
// WHY THIS EXISTS. `/gallery` is the phone's component catalogue, and on this host it
// is the most useful screen there is: `npm run component-sweep` opens it per component
// and is what found every prop and style this host had to answer. But nothing in the
// app links to it — it is a developer page, so the phone does not put it in a tab bar
// and neither should this. Until now the only way in was
// `CORRECTIV_DESKTOP_ROUTE=/gallery` and a restart, which is no way to compare two
// components.
//
// A `Gio.SimpleAction` WITH AN ACCELERATOR, which is how a GTK application offers a
// command. `Ctrl+Shift+G`, on the application rather than the window, so it works
// whichever window has focus and shows up in `gdbus`-driven introspection like every
// other action. `AppRegistry.getApplication()` is the accessor gjsify #1455 added for
// exactly this (`app-registry.ts`, "set_accels_for_action needs one").
//
// NOT GATED ON AN ENVIRONMENT VARIABLE, unlike `debug/route.ts`, and the difference is
// worth stating: that one REPLACES the initial route, so it has to be off unless asked
// for. This one does nothing until somebody presses it. The cost of it existing is one
// action on an application that ships nothing.
//
// `push` and not `replace`, so `Adw.NavigationView`'s back button leads out of the
// gallery to whatever screen you were on. Pressing it twice stacks two galleries,
// which is what a push does and is what back then unwinds.

import Gio from 'gi://Gio?version=2.0';

import { AppRegistry } from '@gjsify/react-native';

/** Ctrl+Shift+G. Shift is in it because Ctrl+G is "find next" almost everywhere. */
const ACCELERATOR = '<Primary><Shift>g';

/** The action's name, without the `app.` prefix its accelerator needs. */
const ACTION = 'gallery';

let installed = false;

/**
 * Install the action, once.
 *
 * Guarded because the call site is a component effect, and a second
 * `add_action` with the same name replaces the first while
 * `set_accels_for_action` appends — so without the guard a remount would leave the
 * accelerator registered twice against one action.
 *
 * Silent when there is no application: that is a typecheck or a test, neither of
 * which has a GTK loop, and neither of which is a failure worth reporting.
 */
export function installGalleryAction(open: (href: string) => void): void {
  if (installed) return;
  const app = AppRegistry.getApplication();
  if (app === null) return;
  installed = true;

  const action = new Gio.SimpleAction({ name: ACTION });
  action.connect('activate', () => {
    console.log(`[desktop] ${ACCELERATOR}: opening the component gallery.`);
    open('/gallery');
  });
  app.add_action(action);
  app.set_accels_for_action(`app.${ACTION}`, [ACCELERATOR]);
}

/** What to tell a human, in one line, so the README and the log agree. */
export const GALLERY_SHORTCUT = ACCELERATOR;
