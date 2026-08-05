import { Linking } from 'react-native';

/**
 * Öffnet ein Ziel außerhalb der App: System-Browser für http(s), zuständige App
 * für alles andere.
 *
 * Bewusst `Linking` und nicht der In-App-Browser aus expo-web-browser: ein Teil
 * der Ziele hier sind Übergaben an andere Apps (`https://wa.me/…` → WhatsApp),
 * und der In-App-Browser würde daraus die WhatsApp-*Webseite* machen. Für die
 * Projektlinks ist der System-Browser außerdem das, was der NativeScript-Stand
 * mit `Utils.openUrl` tat — gleiches Verhalten, kein neues Fenstermodell.
 *
 * Fehler werden geloggt, nicht geworfen: „kein Handler installiert" hat keine
 * sinnvolle Behandlung, und eine unbehandelte Rejection wäre schlimmer.
 */
export function openExternal(url: string): void {
  Linking.openURL(url).catch((err: unknown) => {
    console.warn('[app] konnte Ziel nicht öffnen:', url, err);
  });
}
