# CORRECTIV App — Prototyp (React Native / Expo)

Prototyp der CORRECTIV-App gemäß `../app/KONZEPT.md` und `../app/DATENQUELLEN.md`.
Eine vergleichende Vue-Variante entsteht parallel in `../app-prototype`.

## Stack

- **Expo SDK 56** (React Native 0.85, New Architecture), **TypeScript**, **expo-router** (Tabs + Stack)
- **NativeWind v4** + **Token-Brücke** aus `../wp-design-tokens` (Tailwind v4 → px-Werte + TS-Konstanten)
- **expo-audio** für Live-Radio (Icecast) + Podcasts inkl. Hintergrund-Audio/Lockscreen
  (react-native-track-player ist mit RN 0.85 / New Arch inkompatibel — siehe unten)
- **react-native-webview** für den Artikel-Reader (bereinigtes HTML + eingebettete Fonts)
- **Zustand** (+ AsyncStorage-Persist) für lokalen State
- **fast-xml-parser** (RSS/YouTube-Atom), **htmlparser2 + css-select + domutils** (Artikel-Extraktion)

## Entwicklung

Voraussetzungen: Node ≥ 20, JDK 17, Android SDK (`ANDROID_HOME`), ein Emulator oder Gerät.

```bash
npm install
npm run android        # Dev-Build bauen + auf Emulator/Gerät installieren (einmalig)
npm start              # danach: Metro mit Fast Refresh (Dev-Client, kein Expo Go!)
```

Expo Go funktioniert NICHT (native Module). Immer Dev-Build / Release-APK verwenden.

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
| `npm run tokens` | `tailwind.tokens.generated.js`, `src/lib/theme/tokens.generated.ts`, `readerCss.generated.ts` | Design-Tokens aus `../wp-design-tokens` |
| `npm run fonts` | `src/lib/theme/readerFonts.generated.ts` | Subsetted base64-Fonts für die Reader-WebView (braucht `pyftsubset`) |
| `npm run offline-articles` | `src/lib/articles/offlineArticles.generated.ts` | ~15 vor-extrahierte Artikel (Offline-Cache) |

## Qualität

```bash
npm run check   # tsc (App) + tsc (Tests) + eslint
npm test        # jest: Token-Snapshot, Feed-Parser, Artikel-Extraktion (gegen echte Fixtures)
```

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
- ⏳ M3 Audio/Mediathek · M4 Mitmachen · M5 Club & Profil · M6 Onboarding + Demo-Härtung · M7 Entdecken/Suche
