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

**Der Feed-Daten-Layer ist vereinheitlicht.** Ein `FeedItem`, ein Parser-Satz, ein
Feed-Katalog — alles im Core. Gelöscht: `models.ts`, `feeds/{sources,rss,xml,youtubeAtom}.ts`,
`format.ts`, `sample-data/`, die zwei byte-identischen Feed-Fixtures und `fast-xml-parser`.

Dabei fielen drei Dinge auf, die Messung statt Annahme brauchten:

1. **`authors: string[]` war spekulativ.** Der Prototyp modellierte Ko-Bylines als
   wiederholte `<dc:creator>`-Elemente. Über 200 Live-Items (Haupt-Feed + Faktencheck)
   trägt **jedes** genau eines, und keines ist ein zusammengesetzter Wert. Der Core
   behält `author?: string`; ein Test hält den Befund fest, damit das Array nicht auf
   Vermutung zurückkommt.
2. **Sieben von vierzehn Modelltypen des Prototyps waren toter Code** (`Callout`, `Claim`,
   `PodcastSeries`, `MembershipState` …) — Modelle für Screens, die nie gebaut wurden.
   Der Core hat sie alle, mit echten Beispieldaten. Phase 4c–4e baut darauf, nicht auf
   leeren Hüllen.
3. **Der Browser-User-Agent ist rein defensiv.** Der Kommentar im Prototyp behauptete
   Bot-Filter bei WordPress/CDN. Gegen Feed und Artikel-HTML mit beiden UAs gemessen:
   byte-identische Antworten, HTTP 200. Kein latenter Bug im Core-UA.

**FunFacts läuft jetzt über PeerTube** (`mediaStore` statt eigenem YouTube-Client) — und
das behebt mehr als den Legacy-Pfad: `tube.funfacts.de` sendet
`access-control-allow-origin: *`, der YouTube-Atom-Feed nicht. Im Browser verifiziert, mit
echtem Videotitel.

**Zwei Defekte nebenbei gefunden und behoben:** `services/http.ts` hat seinen
Timeout-`setTimeout` nie gelöscht — nach jedem erfolgreichen Request lief er noch bis zu
8 s weiter (Promise.race verwirft die späte Rejection, es sah also nach nichts aus; sichtbar
wurde es, weil Jest nicht mehr beendete). Und `core-store-binding.test.tsx` hat seine
gerenderten Bäume nie abgebaut: ein montierter Probe bleibt am Store abonniert, reagiert
auf den Reset im `beforeEach` und verschiebt den Zustand für den nächsten Test.

**Entdecken steht** (Phase 4b): Verzeichnis mit 7 Gruppen, Themenschiene, Suche mit
lokalem Rückfall, eine Vorlage für alle Projekt- und Themenseiten. Drei
Entscheidungen darin sind erklärungsbedürftig.

*Der Designentwurf gewinnt gegen den NativeScript-Stand, wo sie sich widersprechen.*
Der NS-Stand baute das Verzeichnis aus grauen `hub-card`s mit Icon;
`docs/DiscoverScreen.dc.html` zeigt Hairline-getrennte Zeilen mit kleinem
Gruppenlabel. Bei 17 Einträgen in 7 Gruppen liest die Liste sich schlicht besser —
und der Entwurf ist laut Plan die Optik-Referenz, der NS-Bestand die
Funktions-Spezifikation. Dasselbe bei der projekteigenen Aktion: eine
Outline-Schaltfläche statt einer zweiten Karte.

*Zwei Namensräume treffen auf eine Route.* `/projekt/<id>` bedient Projekte aus
`projectGroups` **und** Themen aus `interests`; `klima`, `lokal` und `schweiz` gibt
es in beiden. `resolveProject` im Core entscheidet: Projekt gewinnt, weil seine
Seite die redaktionelle Beschreibung und die eigene Aktion hat. Der NS-Stand baute
für jeden Chip eine synthetische Themenseite und überschrieb damit echte
Beschreibungen mit „Alle Beiträge zum Thema Klima." — das ist bewusst geändert.

*Ein nativer Header-Suchbalken wäre der falsche Weg.* `Stack.SearchBar` /
`headerSearchBarOptions` ist die Expo-Empfehlung, aber diese App setzt durchgehend
`headerShown: false` und baut ihre Kopfzeilen selbst, damit iOS, Android und Web
dieselbe Marke zeigen. Ein nativer Balken sieht auf jeder Plattform anders aus und
auf Web gar nicht. Deshalb `ScreenHeader` + `TextInput`. Der `autoFocus` dort ist
eine bewusste Ausnahme von `jsx-a11y/no-autofocus`, mit Begründung in
`.oxlintrc.json`: der Bildschirm existiert für nichts anderes und wird nur durch
einen ausdrücklichen Tipp auf den Sucheinstieg erreicht.

**Ein Defekt, den erst der Browser zeigte:** eine dynamische Route exportiert als
*eine* Datei `projekt/[id].html`. Auf einem statischen Host ohne Rewrites — also
genau GitHub Pages — antwortet damit jede echte URL darunter mit 404;
`/projekt/klima` tat es, während Build, Typecheck und alle Tests grün blieben.
`generateStaticParams()` in der Route löst es: der Export erzeugt jetzt eine Datei
pro Kennung (21 Stück, verifiziert). Nativ war nie betroffen, dort gibt es keine
URLs. Zweiter Fund derselben Art: `tsconfig.test.json` listete `nativewind-env.d.ts`
nicht, weshalb der erste Test, der eine echte Komponente rendert, an jedem
`className` im Baum scheiterte — latent, solange Tests nur `<Text>` rendern.

**Die Mediathek steht** (Phase 4c): Live-Radio, sieben Castopod-Serien, zwei
Video-Kanäle, Club-Bonusspur, Mini- und Vollplayer, Serien- und Videoseite.

*Der Player ist ein Modul, kein Hook.* `useAudioPlayer` bindet die Instanz an eine
Komponente und gibt sie beim Unmount frei — genau das darf nicht passieren, wenn
Wiedergabe Tabwechsel, geschobene Routen und den Hintergrund überleben soll. Also
`createAudioPlayer` auf Modulebene, ein zustand-Store daneben, und React abonniert
nur. Zwei NativeScript-Notbehelfe entfallen dabei: die Positions-Rückschritt-
Erkennung (Androids MediaPlayer sprang bei Ende auf 0, ohne den Complete-Callback
zu feuern) und der 1-Sekunden-Poll-Timer. expo-audio meldet `didJustFinish`,
`isLoaded`, `isBuffering` und `error` selbst. Geblieben ist der Wachhund: die
Lektion war, dass Netzfehler manchmal *gar nicht* ankommen, und ein ewiger Spinner
ist die schlechteste Auskunft.

*Ein Loch im Vorschau-Tor geschlossen.* Der NativeScript-Stand pausierte Club-Audio
bei 60 Sekunden, aber sein Limit feuerte genau einmal (`!this.previewEnded`) —
ein zweiter Druck auf Play spielte die Folge zu Ende und gab damit Club-Inhalt
frei. Hier verweigert `togglePlay` das Fortsetzen jenseits der Grenze und zeigt die
Einladung erneut; ein Test hält es fest.

*Video: eine Route, zwei Quellen, kein Umhängen.* PeerTube spielt nativ über
expo-video (nur die HLS-Master-Playlist mischt Video- und Audio-Spur, die
Renditionen sind getrennt), YouTube bleibt bei der nocookie-Einbettung. Bewusst
**ohne** die Kollaps-Leiste des NativeScript-Stands: dort lag die Videofläche über
den Tab-Frames und schrumpfte beim Verlassen. React Native kann eine Videofläche
nicht umhängen, ohne sie neu zu erzeugen — die nativ passende Antwort ist
Picture-in-Picture, die expo-video mitbringt. Nebenbei ist
`react-native-youtube-iframe` entfallen: die Einbettung, die der NativeScript-Stand
schon benutzte, braucht kein eigenes Player-Paket (und das Paket setzte selbst
wieder auf WebView auf). Dafür ist `VideoFrame` das zweite Plattform-Paar neben dem
Reader, erzwungen durch denselben Guard.

*Der Core hat einen Podcast-Store bekommen* (vorher NativeScript-lokal), mit einer
Schicht weniger: die gebündelten Pro-Show-Snapshots lasen NativeScripts `File`, was
im Core nicht vorkommen darf. Stale-Cache und typisierter Seed decken dasselbe ab.
Und `videoStore.play` fragt die PeerTube-API jetzt nur noch für PeerTube-Videos —
für ein YouTube-Item war das ein garantierter 404, der als „Video defekt" ankam.

**Der teuerste Fund dieser Phase kam wieder erst aus dem Browser.** Um die
Mini-Leiste über die Tab-Bar zu setzen, lag es nahe, die `tabBar`-Prop mit dem
`BottomTabBar` aus `expo-router/tabs` zu bauen. Dieser Import zieht eine **zweite
React-Instanz** ins Bundle; die App stirbt beim Start mit dem minifizierten
React-Fehler #321 („invalid hook call"). Build grün, Typecheck grün, 78 Tests grün,
Seite weiß. Gefunden, indem der statische Export in Chrome geladen wurde — und
eingekreist, indem `Runtime.exceptionThrown` mitgeschnitten wurde: unbehandelte
Ausnahmen tauchen in `console.*` nicht auf, ohne das sieht ein Absturz wie eine
leere Seite aus. Lösung: ein absolut positioniertes Overlay im Tab-Layout, kein
react-navigation-Import.

Zwei kleinere Funde derselben Sorte: `tsconfig.test.json` listete auch `assets.d.ts`
nicht (nach `nativewind-env.d.ts` der zweite Fall — beide bissen erst, als ein Test
den betreffenden Code erreichte), und die Pfad-Aliase wollen in tsc und jest die
**umgekehrte** Reihenfolge: jest-expo leitet einen moduleNameMapper aus
`tsconfig.json` ab, wo der erste Treffer ohne Rückfall gewinnt, während tsc den
generischen `@/*` zuerst braucht, damit `declare module '*.mp3'` überhaupt greift.
Die Differenz trägt jetzt eine Zeile in `jest.config.js`.

**Mitmachen steht** (Phase 4d): drei CrowdNewsroom-Aufrufe, das mehrstufige
Formular aus dem Schema des jeweiligen Aufrufs, Faktenforum mit Prüfstatus und
Quellenbewertung, Abriss-Atlas, Tippkanal.

*Der Zähler ist das Produkt.* „Ihr Beitrag zählt" ist die Zusage, also erhöht eine
Einreichung die sichtbare Zahl sofort und dauerhaft — auf der Übersicht, auf der
Aufrufseite und auf der Dankeseite dieselbe Rechnung
(`responseCount + extraCount(slug)`). Ein Test hält es fest, weil eine Einreichung,
die die Zahl nicht bewegt, still das Versprechen bricht.

*Vertrauen steht vor dem Formular.* „Wer fragt?" und „Was passiert mit Ihren
Daten?" stehen auf der Aufrufseite über dem Knopf, nicht im Kleingedruckten — so
schon im NativeScript-Stand, und die Reihenfolge ist Absicht.

*Eine Falle beim Bauen vermieden:* im Formular hieß der Kopfzeilen-Knopf zunächst
auch „Zurück" — derselbe Text wie der Schritt-zurück-Knopf darunter, mit völlig
anderer Wirkung (Formular verlassen vs. eine Folie zurück). Jetzt „Abbrechen".

*Der Dateianhang bleibt eine Attrappe.* Ein echter Bildwähler wäre ein weiteres
natives Modul für einen Fluss, der ohne Backend nirgends ankommt — die
Beschriftung sagt „simuliert", statt es zu verschweigen.

Nebenbei aufgefallen: **typisierte Routen entstehen bei `expo start`, nicht bei
`expo export`** — und `.expo/` ist gitignoriert. Eine neue Route lässt `tsc` also
lokal scheitern, bis Metro einmal gelaufen ist, während CI ohne `.expo/types` jeden
href durchwinkt. Ein grüner CI-Typecheck ist damit **kein** Beweis über hrefs.

**Profil steht** (Phase 4e, erster Teil): Profil für Gast und Mitglied,
Einstellungen, gespeicherte Artikel, Quartalsbericht. Offen bleiben Beitritts-Flow,
Onboarding und Backstage.

Dabei hat der Core **drei Aktionen bekommen, die es nur scheinbar schon gab**:
`membership.setPaused`, `settings.setNewsletter/setTextScale/setPushOptIn/resetForDemo`
und `interests.clear`. Der Vue-Host kam ohne sie aus, weil sein reaktiver Spiegel
direkte Zuweisungen erlaubte (`membership.paused = !membership.paused`). Ein Store,
der seine Übergänge besitzt, braucht die Aktion — und beide Hosts lesen die Regel
dann aus derselben Stelle. Beim Pausieren ist diese Regel inhaltlich wichtig: es ist
**keine** Kündigung, `isMember` bleibt wahr und Backstage offen (Konzept). Ein Test
hält das fest.

Der „Mein Impact"-Block zeigt drei echte Recherchen. Der NativeScript-Stand filterte
dafür den gebündelten Artikelindex auf `feed === 'recherchen'`; das Expo-Bundle ist
nach URL geschlüsselt und trägt kein Feed-Feld, also entscheidet die URL —
Faktenchecks sind keine Impact-Recherchen.

**Phase 4 ist fertig** (4e, zweiter Teil): Onboarding, Beitritts-Fluss, Backstage,
Recherchetagebuch. Alle fünf Tabs und alle Nebenbildschirme stehen.

*Der Statuswechsel funktioniert.* `join()` im Beitritts-Fluss setzt `isMember`, und
jeder Club-Berührungspunkt reagiert im selben Tick — im Browser durchgeklickt:
Onboarding → App → Profil → Beitritt → Beitrag → Daten.

*Kein Dark Pattern, und das ist getestet.* Bis zum Abschluss steht neben jedem
„Weiter" ein gleichwertiges „Erstmal umsehen", ab Schritt 2 des Onboardings ein
„Überspringen" — und Überspringen **zählt als abgeschlossen**, fragt also nicht beim
nächsten Start erneut. Backstage ist für Gäste vollständig sichtbar; die Knöpfe
laden ein, statt zu sperren („der Club ist Nähe, keine Paywall").

*Beitrag als Presets statt Slider.* React Native hat keinen Slider mehr, und für
Geld ist Antippen genauer als Ziehen — dieselbe Abweichung vom Designentwurf wie
beim Fortschrittsbalken des Players, aus demselben Grund.

*Der Erststart-Sprung greift nur auf „/".* Erst war er unbedingt — und hätte damit
auf dem Web-Target jeden geteilten Link überschrieben: wer `/backstage` aufruft,
soll Backstage sehen. Im Browser gefunden, als der Deep-Link ins Onboarding
umsprang. Nativ existiert der Fall nicht, dort startet die App immer auf `/`.

**Der erste Android-Build dieser App überhaupt** (05.08.2026, lokal): `BUILD
SUCCESSFUL`, 518 Gradle-Tasks. Damit ist belegt, dass `expo-audio`, `expo-video`,
`react-native-webview` und `@expo/ui` unter RN 0.85 mit New Architecture zusammen
durchkompilieren. Nebenbei aufgefallen: **der CI-Job „Android debug build" baut
`apps/mobile`**, die NativeScript-App. Für die Expo-App lief in CI nur der
Web-Export — der Swap in Phase 5 würde den Job also auf etwas umstellen, das dort
noch nie gebaut wurde.

Und der Build hat einen Defekt sichtbar gemacht, den kein Test finden konnte:
**Autolinking bindet das native Modul ein, aber nur das Config-Plugin bearbeitet
die nativen Projekte.** `expo-audio` stand nicht in `app.json` → kein
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, kein Media-Service, kein
`UIBackgroundModes: [audio]`. Hintergrund-Wiedergabe und Lockscreen-Steuerung
hätten also nicht funktioniert, während Build, Typecheck und 273 Tests grün waren.
Behoben und am Generat verifiziert; `recordAudioAndroid: false`, weil die App nicht
aufnimmt und die Standardeinstellung sonst `RECORD_AUDIO` verlangt.

## Offen

- **Das Web-Target sieht keine Live-Artikel.** `correctiv.org` sendet keinen
  `Access-Control-Allow-Origin`-Header, der Browser blockt damit jeden RSS-Request
  (am 05.08.2026 gemessen; native Targets sind nicht betroffen). Das Web-Demo zeigt Shell,
  Beispieldaten und PeerTube-Inhalte — aber keinen Hero, keine „Neueste Recherchen", keine
  Faktenchecks. Drei Wege: (a) CORRECTIV-Ops setzen den Header (ein CDN-/WordPress-Header,
  RSS ist öffentliche Daten — billigster und korrektester Weg), (b) ein gebündelter
  Feed-Snapshot als Web-Fallback (die NS-App generiert schon
  `assets/data/feeds/<key>.json`), (c) ein Proxy. Entscheidung steht aus.
  Seit Phase 4b behauptet das Web-Demo dabei wenigstens nichts Falsches: die Suche
  fällt auf den lokalen Korpus zurück, und die Projektseite schreibt „Beiträge
  konnten nicht geladen werden" statt endlos zu drehen (im Browser verifiziert).
  Phase 4c hat den Befund vervollständigt: von allen Quellen sendet **nur**
  `tube.funfacts.de` den Header (`*`, auch auf den HLS-Playlists — die FunFacts-
  Videos laufen im Browser also wirklich), während `correctiv.org`,
  `salon5.correctiv.net` (Castopod) und `youtube.com/feeds` keinen senden. Auf Web
  zeigt die Mediathek darum echte FunFacts-Videos, aber Podcast-Beispieldaten mit
  dem Hinweis „Ohne Verbindung — Sie sehen Beispielfolgen."
- **Vor dem Swap (Phase 5) herausholen, sonst löscht ihn der `git rm`:**
  `scripts/spike-audio-server.mjs` (verlangt `Authorization: Bearer
  spike-token`, sonst 401 — der beweisende Test für den authentifizierten
  Castopod-Podcast, den die Expo-App genauso braucht) und
  `apps/mobile/src/assets/data/feeds/*.json` samt
  `fetch-offline-{articles,podcasts}.mjs` — das ist Option (b) der CORS-Frage
  oben. Die NativeScript-Fallen aus der README gehören in diese ADR, wo sie
  Geschichte sind statt Gebrauchsanweisung. Empfehlung: NS-Stand als
  **annotierter Tag** `nativescript-final` (ein Branch lädt zu Commits ein, ein
  Tag sagt Schnappschuss; auschecken geht gleich). Und: beide Apps tragen dieselbe
  Package-ID `org.correctiv.app.prototype` — auf einem Gerät geht nur eine, was
  einen Parallelbetrieb zum Vergleichen faktisch ausschließt.
- **Audio ist auf keinem Gerät geprüft.** Die Regeln des Players (Vorschau-Grenze,
  Exklusivität, Wachhund, Lockscreen-Aufruf) sind mit 16 Tests festgehalten, und im
  Browser bringt ein echter Klick auf „Radio abspielen" die Mini-Leiste hoch — dass
  aber wirklich Ton aus dem Icecast-Stream kommt, dass Hintergrund-Wiedergabe und
  Lockscreen-Steuerung funktionieren, kann nur ein Android- oder iOS-Build zeigen.
  `scripts/spike-audio-server.mjs` bleibt für den authentifizierten
  Podcast der beweisende Test (401 ohne Bearer-Token).
- **Der Artikel-/Reader-Typ ist noch doppelt.** `Article` (App) gegen `ArticleDetail` (Core)
  sind anders geschnitten, nicht bloß anders benannt: `kicker`/`topline`,
  `title`/`headline`, `badge`/`ratingText`, plus `dateText`/`excerpt` nur im Core und
  `relatedLinks` nur in der App. Vereinheitlichen heißt `extract.ts` und den
  Reader-HTML-Builder umschreiben — am **einzigen fertigen Screen**. Bewusst zurückgestellt:
  `src/lib/articles/types.ts` sagt, warum.
- **Der Blob-Cache bleibt beim Host.** Die Cache-Policies in den Core zu ziehen scheitert
  vorerst am Port: `FileStore` ist synchron, und der Expo-Adapter hydriert dafür beim Start
  *alles* eager in einen Memory-Spiegel. Für kleine Settings richtig, für ~1 MB Feed-JSON
  vor dem ersten Render falsch. Der Port müsste async werden (er wird an genau einer Stelle
  benutzt, `cache.service.ts`) — eigener Schritt, kein Beiwerk dieser Umstellung.

- GitHub Pages steht noch auf `legacy` (`main:/docs`) und serviert den Designentwurf.
  Umstellen auf `build_type: workflow`, damit der Web-Build deployt wird ohne
  Build-Output zu committen.

