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
- **Lizenz:** entschieden am 05.08.2026 — **AGPL-3.0-or-later für alles**, `apps/mobile-rn`
  eingeschlossen. Der Prototyp trug das MIT-`LICENSE` der `create-expo-app`-Vorlage; es
  liegt jetzt als `apps/mobile-rn/NOTICE.md` und nennt MIT in der Rolle, die es wirklich
  hat: Attribution für den Scaffold. Weder gelöscht (MIT verlangt den Hinweis) noch als
  `LICENSE` belassen (das liest sich als „dieser Teilbaum ist MIT").
- **Zwei Apps im CI**, bis der Swap erfolgt.

## Erledigt nach dieser Entscheidung (2026-08-05)

**Der Core ist frameworkfrei.** Die 8 Stores laufen auf `zustand/vanilla`;
`boundary.test.ts` verbietet jetzt zusätzlich `vue`, `pinia`, `react` und `react-dom`.
Beide Hosts binden selbst: `apps/mobile/src/stores/core-bindings.ts` (Vue-`reactive`-Spiegel,
reproduziert die alte Pinia-Oberfläche, weshalb keine einzige Aufrufstelle umziehen musste)
und `apps/mobile-rn/src/lib/store/core.ts` (zustand `useStore`).

Eine Falle dabei, weil sie sich nicht meldet: **abgeleitete Werte sind exportierte
Selektoren, die State als Argument nehmen — keine Methoden am Store.** Eine Methode
schließt über das `get()` des Vanilla-Stores; ein Vue-`computed`, das sie aufruft, liest
damit State, den Vue nie gesehen hat. Die Abhängigkeit wird nicht registriert, das Template
hört still auf zu aktualisieren — kein Fehler, keine Warnung, Typecheck und Android-Build
bleiben grün. Genau so hatte ich es zuerst geschrieben;
`apps/mobile/test/core-bindings.test.ts` hat es gefunden und schlägt nachweislich fehl,
wenn man es wieder so baut.

**Der Port war synchron, AsyncStorage ist es nicht.** `KeyValueStore.getString` ist
synchron — geerbt von NativeScripts `ApplicationSettings`.
`apps/mobile-rn/src/lib/platform/expo.ts` löst das mit einem In-Memory-Spiegel:
`hydratePlatform()` lädt einmal vor dem ersten Render, Lesen kommt aus dem Speicher,
Schreiben fließt im Hintergrund ab. Gefährlich ist **Lesen vor der Hydration** — die App
startet dann mit leerem State und überschreibt beim ersten Schreiben den echten, was sich
als „Einstellungen setzen sich zufällig zurück" zeigt. Deshalb hängt der Render an der
Hydration und `persist()` wird erst danach registriert. Ein Codepfad deckt alle drei
Targets, weil AsyncStorage einen Web-Build auf localStorage-Basis mitbringt.

`apps/mobile-rn/src/lib/store/saved.ts` ist entfallen — der Reader nutzt den
`savedArticles`-Store des Core. Damit fährt derselbe Store einen Vue- und einen
React-Screen.

**Die Design-Tokens sind ins Repo übernommen** (`tokens/`, vendored aus
wp-design-tokens bei `501ee10` / `v0.1.1`). Vorher war es ein Sibling-Checkout, den beide
Brücken nach oben suchten — und eine Aufwärtssuche kann das eigene Repo nicht von einem
fremden Checkout unterscheiden: auf dieser Maschine fand sie `17b87c8`, während das Repo
`501ee10` meint. Entwickler und CI hätten aus verschiedenen Quellen generiert und das
Übereinstimmung genannt.

Vendoring statt Submodul oder npm-Dependency, begründet in `tokens/README.md`: die
npm-Variante ist nicht verfügbar (das Paket verlangt `tailwindcss >=4.1`, NativeWind v4
verlangt v3 — bliebe nur `--force` oder repo-weites `legacy-peer-deps`), und ein Submodul
ist für 11 KB CSS zu viel Apparat. Die Auflösung liegt jetzt zentral in
`scripts/tokens-source.mjs` und trifft **genau einen** Pfad; gefunden wird die Repo-Wurzel
über einen Marker (Name + `workspaces` in der Root-`package.json`), nicht über `../`-Ebenen
— Ebenen zählen war es, was beim Umzug nach `apps/*` brach.

Der eigentliche Gewinn: **der Drift-Test läuft jetzt bedingungslos.** Vorher hat er sich
im CI selbst übersprungen, weil dort die Quelle fehlte — also genau dort, wo Drift auffallen
muss. Verifiziert, indem `#ff5064` in `tokens/theme.css` verschoben und nicht regeneriert
wurde: der Test schlägt fehl.

## Offen

- Der Expo-Prototyp dupliziert noch die **Modelltypen** (`models.ts`, `format.ts`,
  `feeds/*`, `articles/extract.ts`). Sie sind nicht bloß anders benannt, sondern anders
  geschnitten: `FeedKey` (6 Werte, `recherchen`) gegen `FeedSourceId` (7, `haupt` +
  `europe`), `url` gegen `link`, `feed` gegen `sourceId`, `author?: string` gegen
  `authors: string[]`, `ArticleDetail` gegen `Article`. Vereinheitlichen heißt: Daten-Layer
  plus 11 Komponentendateien umschreiben — direkt bevor Phase 4 die meisten dieser Screens
  ohnehin neu baut. Deshalb **pro Screen beim Neubau**, nicht als Big Bang.
  Der Core gewinnt dabei: `data/feeds.config.ts` ist eine Obermenge von `sources.ts`
  (dieselben zwei Fallen, plus PeerTube-Migration, Castopod-Host und sieben kuratierte
  Shows) — es fehlt ihm nur `europe`.
- Die zwei Cache-Policies aus `lib/net/cachedFetch.ts` sollen in den Core wandern, dort
  aber hinter dessen `FileStore`-Port statt direkt auf AsyncStorage.
- GitHub Pages steht noch auf `legacy` (`main:/docs`) und serviert den Designentwurf.
  Umstellen auf `build_type: workflow`, damit der Web-Build deployt wird ohne
  Build-Output zu committen.

