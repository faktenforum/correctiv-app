import { Linking } from 'react-native';

/**
 * Opens a target outside the app: the system browser for http(s), the registered
 * handler for everything else.
 *
 * Deliberately `Linking` and not expo-web-browser's in-app browser: some of the
 * targets here are handoffs to other apps (`https://wa.me/…` → WhatsApp), and the
 * in-app browser would turn that into WhatsApp's *web page*. For the project links
 * the system browser is also what the NativeScript build did with
 * `Utils.openUrl` — same behaviour, no new window model.
 *
 * Failures are logged, not thrown: "no handler installed" has no useful recovery,
 * and an unhandled rejection would be worse.
 */
export function openExternal(url: string): void {
  Linking.openURL(url).catch((err: unknown) => {
    console.warn('[app] could not open target:', url, err);
  });
}
