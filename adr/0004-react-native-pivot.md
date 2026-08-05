# ADR 0004 — Wechsel auf React Native / Expo, mit Web-Target

**Status:** entschieden, in Umsetzung · **Datum:** 2026-08-05 · **Betrifft:** Stack, Repo-Layout, Web-Demo

## Kontext

[ADR 0003](0003-audio-capability-spike.md) hatte das letzte offene Gate für NativeScript
bestanden, und `APP-STRATEGIE.md` Rev. 2 empfahl zu bleiben. Diese Entscheidung wird
hiermit **umgekehrt** — nicht weil die Empfehlung falsch war, sondern weil zwei
Anforderungen dazukamen, die sie nicht abgedeckt hat:

1. **Ein Web-Target für Demozwecke.** NativeScript hat keins und wird keins bekommen:
   `ns platform add linux` antwortet „Valid platforms are iOS, Android or visionOS", ein
   Web-Renderer ist offiziell abgelehnt (Discussion #10622), `@nativescript/linux` gibt es
   auf npm nicht. Das ist keine Aufwandsfrage, sondern eine Fähigkeitslücke.
2. **Die im Repo vorhandenen App-Versionen sollen zusammengeführt werden.**

## Was die Bestandsaufnahme ergab

Es gab nicht zwei, sondern vier Artefakte — eines außerhalb dieses Repos:

| Artefakt | Ort | Umfang |
|---|---|---|
| NativeScript-App | `apps/mobile` | 43 SFCs / 4.346 LOC `.vue` + 1.378 LOC `.ts` |
| Geteilter Core | `packages/app-core` | 2.168 LOC `.ts` + 329 LOC `.mjs`, 82 Tests |
| „Web-Version" | `docs/` | 1.993 LOC HTML — **generiert**, kein Code |
| Expo-Prototyp | Sibling-Repo, kein Remote | 23 tsx / 828 LOC + 28 ts / 1.437 LOC |

**Die „Web-Version" ist kein Port-Kandidat.** `docs/` wird von `scripts/deploy-demo.sh`
aus dem Sibling-Repo `design-entwurf/project` kopiert: `.dc.html`-Komponenten, die
`support.js` zur Laufzeit über `<dc-import>` auflöst. Es ist der **Designentwurf**.
Zusammenführen heißt hier: der Entwurf bleibt Design-Quelle, der Pages-Slot bekommt den
echten Expo-Web-Build.

## Entscheidung

Auf `apps/mobile-rn` (Expo SDK 56, RN 0.85.3, React 19.2.3) umstellen, den Expo-Prototyp
**ausbauen statt neu anfangen**, und `apps/mobile` nach Feature-Parität löschen.

### Warum ausbauen und nicht neu

- **Betriebswissen ist einkodiert.** `lib/feeds/sources.ts` dokumentiert die
  „Statische-Seite-Falle" (Artikel-Feeds nur unter `/category/<slug>/feed/`) und
  „Icecast antwortet auf HEAD 400". Ein Neuanfang erarbeitet dieselben Fallen erneut.
- **Begründete Architekturentscheidungen**, im Code kommentiert: `cachedFetch` erklärt,
  warum kein TanStack Query („die Offline-Reihenfolge soll explizit und deterministisch
  sein, damit die Demo nie vom WLAN abhängt").
- **Aktueller Stand:** New Architecture, `experiments.reactCompiler: true`, und
  `useAsyncData` ist bewusst React-Compiler-konform geschrieben.
- **Die Audio-Frage ist dort schon gelöst.** `react-native-track-player` ist unter RN 0.85
  New Arch kaputt, daher `expo-audio` — dokumentiert im README des Prototyps.

### Was den Ausschlag gab: Audio und iOS

`expo-audio` liefert als **Erstanbieter-API** genau das, wofür ADR 0003 auf Android an der
Plattform-API vorbei am Plugin arbeiten musste:

| Anforderung | NativeScript | Expo |
|---|---|---|
| `Authorization`-Header am Stream | Plugin kennt keine Header → Plattform-API direkt | `headers` auf der `AudioSource` |
| Hintergrund-Wiedergabe | manuell, Foreground-Service offen | `shouldPlayInBackground`, Config-Plugin |
| Lock-Screen | MediaSession von Hand | `setActiveForLockScreen()` |
| Offline | DownloadManager von Hand | `downloadFirst` |
| iOS | ungeprüft, brauchte einen Mac | dokumentiert für beide Plattformen |
| Web | nicht möglich | unterstützt |

Dazu: **EAS Build baut iOS in der Cloud.** Der als offen vermerkte iOS-Audio-Spike
entfällt damit als Blocker, und die stehende Einschränkung „kein Mac" ist keine mehr.

## Das Web-Target: was wirklich fehlte

`react-native-web` war bereits Dependency, `app.json` deklarierte bereits
`"web": { "output": "static" }`. Es fehlten ein Skript und **eine** Plattformweiche.

**Die eine echte Lücke — und die Falle daran:** `react-native-webview` hat keine
Web-Implementierung. Auf Web rendert es den roten Satz „React Native WebView does not
support this platform." — und `expo export --platform web` **läuft trotzdem durch**. Das
exportierte `/artikel.html` enthielt diesen Satz. Ein CI-Job, der nur den Export prüft,
hätte grün gemeldet, während der Reader kaputt war.

Deshalb ist der Reader ein Plattform-Paar hinter einem gemeinsamen Props-Typ
(`ReaderView.tsx` / `ReaderView.web.tsx` / `types.ts`), und deshalb ist die Regel ein
**Test** (`__tests__/web-target.test.ts`), kein Kommentar.

Der iframe ist hier die ehrliche Entsprechung, weil `buildReaderHtml()` das Dokument lokal
baut — es wird nichts Fremdes geframed. Er ist mit `sandbox="allow-same-origin"` und sonst
nichts versehen: `extract.ts` entfernt ohnehin `script`/`style`/`iframe`/`form`, der Reader
braucht also kein JS, und `allow-scripts` weglassen kostet nichts. `allow-same-origin` ist
nötig, damit Klicks im iframe durch dasselbe `onNavigate` laufen wie im nativen WebView.
Beide zusammen dürfen nie gesetzt werden — dann kann der Frame seine Sandbox selbst
entfernen.

## Verifiziert

Nicht nur gebaut, sondern im Browser ausgeführt (Headless Chrome gegen den statischen
Export, mit **Clean URLs**):

- **Home:** vollständiger Inhalt — Spotlight-Briefing, Backstage-Teaser, Mediathek,
  Salon5-Radio-Kachel, alle fünf Tabs, Fonts geladen
- **`/artikel`:** iframe mit dem Artikel — korrektes `h1`, 19 Absätze, 4 eingebettete
  Fonts, 502 KB selbstenthaltendes Dokument, kein WebView-Stub
- **`contentDocument` unter der Sandbox erreichbar**, 15 Anchors gefunden — die
  Klick-Interception greift also wirklich

Falle für den nächsten Test: **mit Clean URLs servieren.** `python3 -m http.server` liefert
`/index.html` als wörtlichen Pfad, Expo Router matcht dann nichts und rendert seine
„unmatched route"-Seite — das sieht wie ein App-Fehler aus, ist aber ein Server-Artefakt.

## Preis

- **Vue entfällt als Hausstandard für die App.** CORRECTIV ist ein Vue-Haus (5 Frontends +
  `@beabee/vue`); genau das war am 01.08.2026 das Argument für NativeScript. Der Pivot
  nimmt der App diese Nähe zu beabee und faktenforum. Bewusst in Kauf genommen.
- **Die UI muss nachgezogen werden.** NativeScript liegt mit 4.346 zu 828 LOC vorn;
  `entdecken`, `mediathek`, `mitmachen` und `profil` sind im Expo-Stand Stubs.
- **Lizenz:** der Prototyp stand unter **MIT**, dieses Repo unter **AGPL-3.0-or-later**.
  Sein `LICENSE` bleibt zunächst unter `apps/mobile-rn/` liegen, damit die Herkunft
  sichtbar ist. **Offene Entscheidung für CORRECTIV**, nicht stillschweigend umgestellt.
- **Zwei Apps im CI**, bis der Swap erfolgt.

## Offen

- `packages/app-core` ist noch Pinia-gebunden (8 Stores, 321 LOC ≈ 13 % des Core). Plan:
  `zustand/vanilla` im Core, React-Bindung in der App; `boundary.test.ts` verbietet dann
  zusätzlich `vue` und `pinia`.
- Der Expo-Prototyp dupliziert ~560 LOC des Core (`models`, `format`, `feeds/*`,
  `articles/extract`). Der Core gewinnt — `data/feeds.config.ts` ist eine Obermenge von
  `sources.ts` (dieselben zwei Fallen, plus PeerTube-Migration, Castopod-Host und sieben
  kuratierte Shows).
- GitHub Pages steht noch auf `legacy` (`main:/docs`) und serviert den Designentwurf.
  Umstellen auf `build_type: workflow`, damit der Web-Build deployt wird ohne
  Build-Output zu committen.
- `wp-design-tokens` liegt außerhalb des Repos. Beide Token-Brücken suchen es jetzt nach
  oben statt Ebenen zu zählen, aber im CI existiert es nicht — die generierten Dateien
  sind committet. Wie es sauber hereinkommt (Submodul, npm-Dependency, vendoring), ist
  eine offene Infrastrukturentscheidung.
