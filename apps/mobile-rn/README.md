# CORRECTIV App — Prototyp (React Native / Expo)

Die CORRECTIV-App auf Expo/React Native — **iOS, Android und ein Web-Target für Demos**.

Dies ist die App, auf die umgestellt wird. Die NativeScript/Vue-Variante liegt weiterhin
als Referenz in [`../mobile`](../mobile) und ist bei der UI noch vollständiger (4.346 zu
828 LOC) — sie ist damit die Vorlage für den Nachbau, nicht ein Konkurrent.
Warum gewechselt wurde: [ADR 0004](../../adr/0004-react-native-pivot.md).

Fachliche Vorgaben: `KONZEPT.md` und `DATENQUELLEN.md` im Schwester-Repo `../../../app`.

## Stack

- **Expo SDK 56** (React Native 0.85, New Architecture), **TypeScript**, **expo-router** (Tabs + Stack)
- **NativeWind v4** + **Token-Brücke** aus dem Schwester-Repo `wp-design-tokens`
  (Tailwind v4 → px-Werte + TS-Konstanten). Der Pfad wird nach oben gesucht, nicht
  gezählt — siehe `scripts/generate-tokens.mjs`.
- **expo-audio** für Live-Radio (Icecast) + Podcasts inkl. Hintergrund-Audio/Lockscreen
  (react-native-track-player ist mit RN 0.85 / New Arch inkompatibel — siehe unten)
- **react-native-webview** für den Artikel-Reader (bereinigtes HTML + eingebettete Fonts).
  Auf **Web** gibt es dafür keine Implementierung — dort rendert ein iframe dasselbe
  HTML. Beide Wege liegen hinter `components/reader/ReaderView`, abgesichert durch
  `__tests__/web-target.test.ts`.
- **Zustand** (+ AsyncStorage-Persist) für lokalen State
- **fast-xml-parser** (RSS/YouTube-Atom), **htmlparser2 + css-select + domutils** (Artikel-Extraktion)

## Entwicklung

Voraussetzungen: Node ≥ 20. Für Android zusätzlich JDK 17 und Android SDK
(`ANDROID_HOME`) mit Emulator oder Gerät. **Für Web nichts davon.**

`npm install` läuft in der **Repo-Wurzel** (npm-Workspace), nicht hier.

```bash
npm run web            # Browser mit Fast Refresh — kein Emulator, kein SDK
npm run android        # Dev-Build bauen + auf Emulator/Gerät installieren (einmalig)
npm start              # danach: Metro mit Fast Refresh (Dev-Client, kein Expo Go!)
npm run build:web      # statischer Export nach dist/
```

Expo Go funktioniert NICHT (native Module). Immer Dev-Build / Release-APK verwenden.

Den statischen Export **mit Clean URLs** servieren (`/artikel`, nicht `/artikel.html`).
Ein einfaches `python3 -m http.server` liefert den Pfad wörtlich, Expo Router matcht dann
nichts und zeigt seine „unmatched route"-Seite — das sieht wie ein App-Fehler aus, ist
aber der Server.

iOS: über **EAS Build in der Cloud, ohne Mac**. `ios/` existiert noch nicht und wird von
`expo prebuild` erzeugt.

### Release-APK (Demo-Gerät)

```bash
cd android && ./gradlew assembleRelease                          # universal (alle ABIs)
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a   # nur arm64 (echtes Gerät)
adb install -r app/build/outputs/apk/release/app-release.apk
```
Release ist selbst-enthaltend (JS gebündelt, kein Metro nötig) und mit dem Debug-Keystore
signiert (für die Demo ausreichend; vor echter Verteilung eigenen Keystore erzeugen).

## Generierte Artefakte (nicht von Hand editieren)

| Skript | Erzeugt | Zweck |
|---|---|---|
| `npm run tokens` | `tailwind.tokens.generated.js`, `src/lib/theme/tokens.generated.ts`, `readerCss.generated.ts` | Design-Tokens aus dem `wp-design-tokens`-Repo |
| `npm run fonts` | `src/lib/theme/readerFonts.generated.ts` | Subsetted base64-Fonts für die Reader-WebView (braucht `pyftsubset`) |
| `npm run offline-articles` | `src/lib/articles/offlineArticles.generated.ts` | ~15 vor-extrahierte Artikel (Offline-Cache) |

## Qualität

```bash
npm test        # jest: Token-Snapshot, Feed-Parser, Artikel-Extraktion (echte Fixtures),
                #       Web-Target-Guard
npm run typecheck   # tsc (App) + tsc (Tests)
```

Gelintet und formatiert wird aus der **Repo-Wurzel** mit oxlint/oxfmt (`npm run check`
prüft alle Workspaces zusammen); ESLint ist hier entfallen.

## Architektur

```
src/
  app/                 expo-router-Routen ((tabs)/ + artikel, …)
  components/ui/        Design-System (Typo, Button, Card, Badge, Chip, Screen, …)
  components/feed|home/ Feed- und Home-Bausteine
  lib/theme/            Token-Brücke-Outputs + Typografie + Fonts
  lib/feeds/            Quellen-Registry, RSS/Atom-Parser, Client, useFeed-Hook
  lib/articles/         Extraktion, Reader-HTML, og:image, Offline-Bundle
  lib/net/              cachedFetch (network-first / cache-first Policies)
  lib/store/            Zustand-Stores (persist)
data/                   Beispieldaten (Form künftiger API-Antworten)
scripts/                Generatoren (Token-Brücke, Fonts, Offline-Artikel)
__tests__/ + __fixtures__/  Unit-Tests gegen echte Feed-/Artikel-Snapshots
```

## Wichtige Entscheidung: Audio

`react-native-track-player@4.1` kompiliert unter RN 0.85 erst nach Kotlin-Patch und
crasht dann zur Laufzeit unter der New Architecture (`TurboModule … returnType == void`).
RN 0.85 bietet keine Old-Architecture-Option. Daher **expo-audio** (offiziell, New-Arch-kompatibel,
Icecast-Streaming + Hintergrund-Audio + Lockscreen-Controls). Audio ist in `src/lib/audio/` gekapselt.

## Status (Roadmap aus dem Konzept)

- ✅ **M0** Fundament · ✅ **M1** Datenlayer + Home · ✅ **M2** Artikel-Reader
- ✅ **Web-Target** — im Browser verifiziert: Home mit vollem Inhalt und allen fünf Tabs,
  Reader mit Artikel im iframe (korrektes `h1`, 19 Absätze, eingebettete Fonts)
- ⏳ M3 Audio/Mediathek · M4 Mitmachen · M5 Club & Profil · M6 Onboarding + Demo-Härtung · M7 Entdecken/Suche

Die Screens `entdecken`, `mediathek`, `mitmachen` und `profil` sind noch Stubs. Vorlage
für den Nachbau ist [`../mobile`](../mobile) — dort liegen 43 fertige SFCs.

## Was noch aus dem Core kommen soll

`src/lib/models.ts`, `src/lib/format.ts`, `src/lib/feeds/*` und
`src/lib/articles/extract.ts` doppeln rund 560 LOC aus `@correctiv/app-core`. Der Core
gewinnt: seine `data/feeds.config.ts` ist eine **Obermenge** von `feeds/sources.ts` —
dieselben zwei Fallen (Kategorie-Feeds, Icecast-HEAD), plus PeerTube-Migration,
Castopod-Host und sieben kuratierte Shows. Umgekehrt sollen die zwei Cache-Policies aus
`lib/net/cachedFetch.ts` in den Core wandern, dort aber hinter dessen `FileStore`-Port
statt direkt auf AsyncStorage, damit sie auch auf Web tragen. Siehe
[ADR 0004](../../adr/0004-react-native-pivot.md).
