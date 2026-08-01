# App-Strategie CORRECTIV: Ein Codebase, drei Targets — was geht, was nicht, und was jetzt zu tun ist

**Stand:** 01.08.2026 (Rev. 2) · **Autor:** technische Analyse für Pascal Garber · **Adressaten:** Pascal, Max, Philipp, Benjamin, Sara, Caro

> **Revision 2 — die Stack-Empfehlung hat sich gedreht.** Rev. 1 empfahl den Wechsel zu Expo. Drei nachgeprüfte Fakten kippen das:
> **(1)** React und React Native gehören seit Februar 2026 der **React Foundation** (Linux Foundation, acht Platinum-Mitglieder) — das Governance-Argument gilt für beide Stacks und entscheidet nichts mehr. **(2)** Push ist auf NativeScript **kein** Loch: `@nativescript/firebase-messaging` 5.0.2 (offizielle Org, 15.09.2025) existiert; die Lücke betrifft nur OneSignal als Werkzeug. **(3)** CORRECTIV betreibt fünf Vue-Frontends (Faktenforum Nuxt ×3, beabee ×2) plus ein bereits extrahiertes Komponentenpaket `@beabee/vue` — ein Wechsel zu React hieße, dauerhaft **zwei** Frontend-Skillsets zu pflegen.
> **Neue Empfehlung: bei NativeScript bleiben**, mit dem in Abschnitt 8 benannten Preis. Abschnitt 2 (was technisch geht) ist unverändert gültig — er beschreibt Tatsachen, keine Präferenzen.

---

## 1. Kontext & Auftrag

Im Meeting vom 27.07.2026 wurden drei Dinge beschlossen: die Beta soll auf den Frameworks laufen, die wir langfristig wollen; Content kommt als Webview-Einbettung, App-Chrome native; und es muss geprüft werden, ob Pascals Prototyp gut genug ist, um darauf aufzubauen. Parallel steht die Frage im Raum, ob es „eine Codebase, drei Targets" (Web, Android, iOS) geben kann — oder ersatzweise eine Linux-Version — damit nicht jede Änderung im Emulator getestet werden muss.

Dieses Dokument beantwortet beides, plus die im Meeting gestellte Frage „Die großen Arbeitspakete liegen doch bei WordPress und beabee — wie viel Arbeit ist die App eigentlich?". Alle technischen Aussagen wurden gegen den Code, gegen die Registries und gegen die Store-Guidelines geprüft. Wo Prüfung und Erwartung auseinanderfielen, steht das Prüfergebnis. **Zu entscheiden ist: Framework, Identity-Provider, Reader-App-Positionierung, Entitlement-Matrix — in dieser Reihenfolge.**

---

## 2. Kurzantwort auf die Kernfrage

**Linux: nein. Nicht „schwierig", sondern nicht existent.** `ns platform add linux` antwortet wörtlich „Valid platforms are iOS, Android or visionOS". Es gibt kein `@nativescript/linux` (npm 404), keine GTK/Qt-Bindings, und der Feature-Request dafür ist seit **01.04.2015** offen (279 Upvotes). Der einzige ernsthafte Versuch (`bundyo/nativescript-platform-desktop`, ~40 Core-Reimplementierungen auf NodeGui/Qt) hat seinen letzten Commit im Februar 2020. `@nativescript/core` 9.0.20 liefert ausschließlich `platforms/{android,ios}` — 81 `.android.js`, 77 `.ios.js`, **null** `.linux.js`/`.web.js`. Bitte aus der Diskussion streichen. — Bemerkenswert nur als Randnotiz: Desktop-Arbeit *gibt* es upstream, aber für die zwei Betriebssysteme, die CORRECTIV nicht hat (`@nativescript/macos` 9.0.0 braucht Xcode und ist kein CLI-Target; `@nativescript/windows` 0.1.0-beta.4 vom 30.07.2026 braucht Windows + Visual Studio 2022).

**Web mit NativeScript: nein.** Es gibt keinen DOM-Renderer und es ist keiner geplant. Der Lead-Maintainer hat einen Web-Runtime in Discussion #10622 ausdrücklich abgelehnt und empfiehlt stattdessen ein Monorepo, in dem Views **zweimal** geschrieben werden. Das Tool, das die Docs dafür empfehlen (`@nativescript/nx`), unterstützt nur Angular und „vanilla" — im Quellcode steht `// TODO: support react, svelte, vue`. Alle historischen Versuche sind tot (`nativescript-vue-web` archiviert am 19.05.2026, letzter Code 2019). Die einzige lebende Adapter-Option, `nativescript-web-adapter`, ist ein 160-Zeilen-Regex-Transformer mit 62 Downloads/Monat, der demo-spezifischen Hardcode im veröffentlichten Paket enthält und an unserer Navigation deterministisch scheitern würde (er matcht nur `$navigateTo(X)` mit einem Argument — wir rufen immer mit `{ frame: 'tab-…' }` auf).

**Der Vollständigkeit halber, weil es die einzige echte Ausnahme ist:** Es gibt im NativeScript-Ökosystem tatsächlich *einen* Weg zu „ein Codebase → Web + iOS + Android" — `rEFui` (85 Stars, gepusht 28.07.2026, aktiv gepflegt) rendert über `refui/dom` ins Web und über `DOMiNATIVE` (`dominative` 0.1.3) nach NativeScript; `trycatch-labs/dark` ist ein zweiter Fall desselben Musters. Beide sind aber JSX-/Signals-Frameworks **ohne jede Vue-SFC-Unterstützung**. Sie zu nutzen heißt, alle 43 `.vue`-Dateien neu zu schreiben — also derselbe Preis wie ein Stack-Wechsel, nur in ein Ökosystem mit dreistelligen Nutzerzahlen. Kein realistischer Weg für einen Newsroom, aber die Behauptung „technisch völlig unmöglich" wäre falsch.

**iOS: ja, aber nie von Linux aus gebaut.** Der Xcode-Lizenzvertrag erlaubt Ausführung „ONLY ON AN APPLE-BRANDED PRODUCT RUNNING MACOS". `ns preview` als Ausweg funktioniert nicht — es stürzt in unserem Repo ab, weil es `@nativescript/webpack` zwingend braucht, und die Preview-App lädt ohnehin keine eigenen Native-Plugins (wir haben fünf).

**Die ehrliche Konsequenz: Der Wunsch „drei Targets aus einer Codebase" ist mit NativeScript strukturell nicht erfüllbar — mit Expo/React Native wäre er es.** (Warum wir trotzdem bei NativeScript bleiben und den Web-Build selbst schreiben: Abschnitt 8.) Der Web-Export des Schwester-Prototyps wurde real ausgeführt: `npx expo export -p web` → Exit 0, 1.545 Module in 23 s, 13 statische Routen, und die `index.html` enthält den echten deutschen Home-Screen server-gerendert. iOS läuft dort über EAS auf Expos gehosteten macOS-Workern, `eas submit` von Linux aus.

**Empfehlung (Rev. 2): bei NativeScript bleiben** und das Web-Target selbst bauen — geteilter Core plus separat implementierte Web-UI, die dann **Vue** ist und sich Komponenten mit beabee und Faktenforum teilen kann. Begründung und Preis in Abschnitt 8. Der Schritt ist umgesetzt: `packages/app-core` existiert, ist plattformfrei und headless getestet (ADR 0001).

**Wichtige Ehrlichkeit zum Web-Target, egal welcher Stack:** Es trägt das Chrome, die Logik und die Artikel-Typografie. Es trägt **nicht** Webview-Session, Background-Audio, Push, Downloads und Scroll-Performance. `react-native-webview` hat keine Web-Implementierung — es rendert wörtlich den String „React Native WebView does not support this platform." Und `correctiv.org/feed/` sendet keinen `Access-Control-Allow-Origin`-Header, alle Feeds müssen im Browser über einen Proxy laufen. Ein Web-Target, das man für End-to-End-Validierung hält, ist schlimmer als keines.

---

## 3. Befund: Ist der Prototyp eine tragfähige Grundlage?

**Antwort auf die Meeting-Frage: Der Code ist gut. Die Screens sind es nicht mehr — nicht wegen Qualität, sondern weil der Scope sie löscht.**

Quantitativ (43 `.vue` + 43 `.ts/.mjs`, 7.145 LOC, entstanden in 36 Commits über 5 Tage im Juni 2026):

| Kategorie | Dateien | LOC | Status |
|---|---|---|---|
| Reines TS/JS, **null** NativeScript-Imports | 31 | 2.072 (29 %) | portabel, unverändert |
| TS mit NativeScript-Kopplung | 14 | 1.355 (19 %) | Adapter nötig, Kopplung ist dünn |
| `.vue`-SFCs | 43 | 3.718 (52 %) | davon 24 nur Vue-Core-Imports |
| SCSS im NativeScript-Dialekt | — | 2.097 | **nicht** portabel |

Qualitätsbefund, verifiziert: `npx tsc --noEmit` und `npx vue-tsc --noEmit` laufen beide mit **Exit 0** bei `strict: true`, 12 `any` in 7.145 LOC, null `@ts-ignore`. Saubere Schichtung Services → Stores → Views mit stale-while-revalidate-Cache. Zwei funktionierende CI-Workflows inklusive signierter Release-Pipeline. — Damit ist eine Behauptung aus der Recherchephase widerlegt: es gibt **keinen** aktiven TS-Fehler, der still durch die CI läuft. Der Typcheck kann sofort grün eingeschaltet werden.

**Was fehlt:** null Tests, null Lint, null Typecheck-Script, null Auth (grep über `src/` nach `login|oauth|oidc|jwt|bearer|keychain` → **0 Treffer**), null Accessibility (`accessibilityLabel`/`automationText` → **0 Treffer**, und die App nutzt einen Icon-Font, d. h. Icon-Buttons sind für TalkBack/VoiceOver stumm), null i18n, null Observability, null Deep-Links.

**Vier harte Blocker:**

1. `targetSdkVersion 34` (verifiziert in `App_Resources/Android/app.gradle`) — Google Play fordert seit 31.08.2025 API 35 und ab 31.08.2026 API 36. **Die App ist heute nicht einreichbar.** Der Grund ist architektonisch: `targetSdk 35` erzwingt Edge-to-Edge, was die 96 Zeilen imperatives `setStatusBarColor` in `src/lib/system-bars.ts` bricht.
2. `LICENSE` ist AGPL-3.0-or-later — inkompatibel mit App-Store-Distribution (VLC-Präzedenz). CORRECTIV hält das Copyright, ist also lösbar — aber **vor** dem ersten externen Commit.
3. Release-Builds funktionieren nur mit abgeschalteter Minification (`vite.config.ts`), Ursache unbekannt und **upstream nicht gemeldet**. Dieselbe Fehlersignatur (`Module evaluation promise rejected: bundle.mjs`) bricht auch HMR. Der naheliegende Ausweg — Vite 8 mit Rolldown — wurde **gemessen** (ADR 0002): Er **behebt den Minify-Crash tatsächlich** (minifizierter Build startet auf dem Emulator, Activity resumed, keine Crash-Signatur) und macht den Build **7x schneller** (1,5 s statt 10,3 s) bei ~15 % kleineren Bundles. Er ist aber **noch nicht auslieferbar**: die NativeScript-Polyfills fallen still aus dem Bundle (`installPolyfills` 12x -> 0x), wodurch auf dem Gerät jeder Netzwerkaufruf mit `XMLHttpRequest is not defined` scheitert — bei grünem Build. Sobald das gelöst ist, erledigt Vite 8 zwei der vier Blocker auf einmal.
4. iOS wurde nie gebaut: `@nativescript/ios` ist nicht einmal installiert, null `__IOS__`-Zweige.

**Was auf jeden Fall bleibt** (stack-unabhängig, das ist der eigentliche Wert): die Datenmodelle, `format.ts`, der RSS-Parser, die Cache-Kaskade, die Design-Token-Pipeline, die Callout-Journey (`CalloutFormPage.vue` spricht schon beabees echtes Formio-Schema), die Webview-Bridge-Logik in `ArticleReaderPage.vue:105-119`, das `modules[]`-Feed-Muster der Homepage — und, am wertvollsten, die 17-zeilige „Toolchain gotchas"-Tabelle im README.

**Was neu gebaut werden muss:** Auth/Session/Entitlements (komplett), Audio-Stack (~600 LOC Rewrite: kein MediaSession, kein Foreground-Service, keine Downloads, keine HTTP-Header möglich, iOS-Livestream laut Code-Kommentar kaputt), Push (kein offizielles OneSignal-SDK für NativeScript), Reader (der aktuelle scrapt correctiv.org per Regex und interpoliert CMS-Text **ohne Escaping** in eine `file://`-Webview — ~730 LOC, die gelöscht werden).

---

## 4. Der Produkt-Pivot und was er kostet

KONZEPT.md formuliert als **bindendes** Prinzip: „Journalismus ist immer frei. Kein Artikel, kein Faktencheck, kein Video steht je hinter einer Schranke", plus „Club statt Paywall" und eine verbotene Vokabelliste („freischalten", „Premium", Schloss-Icons, Artikelzähler). Der neue Scope kehrt das um. Das ist eine Produktentscheidung, kein Code-Problem — aber sie hat konkrete Code-Kosten:

**Maschinerie, die stirbt (~1.000 LOC UI + 1.034 LOC Fixtures):** die 60-Sekunden-Audio-Preview (`PREVIEW_LIMIT_SEC` in `stores/audio.ts`, plus `'preview'` in der `AudioTrack.kind`-Union und Call-Sites in drei Views), `ClubInviteSheet.vue` (app-weit gemountet), `EarlyAccessCard.vue` mit „für alle in X Std."-Countdown, `ClubBadge.vue` (10 Verwendungen in 9 Dateien), `ImpactFooter.vue`, der gesamte Backstage-Bereich (392 LOC — im neuen Scope nicht vorhanden), `JoinFlowModal.vue` (183 LOC simuliertes Bezahlen, zusätzlich Apple-3.1.1-Risiko), der Gast-Modus in ~8 Screens, `DiscoverPage.vue` + `data/projects.ts`.

**Texte, die faktisch falsch werden** — und die uns zitiert würden: „**0** Artikel hinter einer Paywall — heute und in Zukunft" (großer Zahlenblock in `JoinFlowModal.vue:38`), „Ohne Paywall — Journalismus für alle", „Alles Wichtige bleibt frei zugänglich", „Die ersten 60 Sekunden gehören allen". Insgesamt ~18 ausgelieferte Strings.

**Was rettbar ist:** Das Backstage-**IA-Muster** — exklusive Inhalte inline im normalen Feed statt in einem abgesperrten Flügel — passt exakt auf die neue Formatexklusivität (Audio, Video, Games, Story-Extras). Muster behalten, Mitgliedschafts-Achse entfernen.

**Dringend:** KONZEPT.md und README beschreiben aktuell das **Gegenteil** des geplanten Produkts, und das Meeting erwägt, die Beta an Freelancer, Agentur oder AI zu geben. Ein „Superseded by 27.07.2026"-Abschnitt, der benennt, welche Prinzipien gelten (Mitmachen als Kern, eine Marke/viele Projekte, keine Dark Patterns) und welche void sind, ist der billigste denkbare Schutz gegen einen teuren Fehlbau.

---

## 4a. Login-Architektur und Apple-Abrechnung — bitte hier genau lesen

**Pascals Begründung, korrekt wiedergegeben:** Der Login existiert nicht als Paywall, sondern als Erkennungsmechanismus. Er erlaubt der App, eine **außerhalb** der App (in beabee, im Browser) erworbene Mitgliedschaft zu erkennen, damit Apples In-App-Purchase-Pflicht nie greift. Die 0-€-Stufe existiert, damit „ein Konto haben" kostenlos ist und die Login-Schranke auf der Website billig bleibt.

**Die Strategie trägt — aber nicht aus dem angenommenen Grund.** Das tragende Instrument ist Apple Guideline **3.1.3(a) „Reader" Apps**: „Apps may allow a user to access previously purchased content or content subscriptions (specifically: magazines, newspapers, books, audio, music, and video)." Diese Klausel hat **keine** IAP-Paritätsbedingung. Der Login ist nur Voraussetzung dieses Status, nicht der Grund. Die 0-€-Stufe spielt für Apple **keine Rolle** — sie ist ein Website-Instrument.

Die Falle heißt **3.1.3(b) Multiplatform Services**: Zugriff auf extern erworbene Inhalte ist erlaubt, „provided those items are also available as in-app purchases within the app." Wörtlich gelesen fällt jede App, die ein Web-Abo einlöst, unter 3.1.3(b) und schuldet IAP-Parität — **außer** 3.1.3(a) greift. Die Reader-Klassifikation ist also ein **Single Point of Failure**, kein Nice-to-have. Zwei dokumentierte Ablehnungen zeigen genau das: Forum-Thread 720232 (App mit Gratis-Features plus extern gekauften Kursen) → 3.1.1 abgelehnt; Thread 811018 (B2B-SaaS, nur Login, keine Links, kein Upsell) → „Your app accesses digital content purchased outside the app, and that content is not available through in-app purchase."

**Meine Ausgangsvermutung war an zwei Punkten falsch, und das Prüfergebnis überschreibt sie:**

**(1) Die „>0 € am Login"-Bedingung ist NICHT der Risikotreiber.** Genau diese Form liegt heute im deutschen App Store: **Republik AG** (kostenlos, keine In-App-Käufe, v2.4.7/Juni 2026) verlangt laut eigener FAQ „eine gültige Mitgliedschaft oder ein Monatsabo", hat E-Mail-Link-Login, keinen Gast-Modus, verkauft nichts in der App und hat in v2.3.0 sogar einen Link zur Mitgliedschaftsverwaltung ergänzt. **Krautreporter Audio** (Krautreporter eG, kostenlos, keine IAP): „Mit der Krautreporter-Audio-App kannst du als Mitglied alle unsere Artikel und Podcasts anhören", Mitgliedschaft über Steady im Web. Netflix: kein Gratis-Tier, Login-Pflicht, IAP 2018 entfernt.

**(2) 0-€-Mitglieder einzulassen würde das Risiko NICHT senken, sondern wahrscheinlich erhöhen.** Guideline 5.1.1(v) bleibt unverändert — ein kostenloser Login ist ein Login; Apples dokumentiertes Remedy ist ein **Gast-Pfad**, keine Gratis-Kontostufe. Und die Tier-Schranke würde nach **innen** wandern, auf die Formatexklusivität: Audio und Video sind Reader-Kategorien, **Games und Story-Extras nicht**. Eine sichtbare In-App-Schranke, die Games gegen eine extern gekaufte Mitgliedschaft freischaltet, ist exakt das Muster aus Thread 720232. Eine undurchsichtige Login-Tür exponiert **weniger**.

**Die drei echten Risikotreiber, in dieser Reihenfolge:**

1. **Reader-Klassifikation vs. Mitmachen-Tab.** Die Eligibility verlangt die Reader-Inhaltstypen „as the primary functionality of the app". Forum-Thread 759323 dokumentiert eine Abo-Lese-App, deren **einzige** Extras Mitglieder-Rezensionen und Artikel-Diskussionen waren — abgelehnt, weil der Prüfer befand, „any inclusion of additional functionality automatically made us not a Reader app", nach zwei Jahren und einem Dutzend vorheriger Freigaben. Unser Scope ist deutlich schwerer: CrowdNewsroom, Games/Quiz, Events mit Kalender-Speicherung, Reporterfabrik-Rabatte, Kaffeekarten-Punkte, Abo-Nummer mit Shop-Rabatt. Nichts davon ist Magazin/Zeitung/Buch/Audio/Musik/Video. **Das, nicht die >0-€-Bedingung, kann die ganze Strategie kippen.**
2. **Der „blockiert → Mitgliedschaft upgraden"-Screen.** Die 3.1.3-Präambel: Apps „cannot, within the app, encourage users to use a purchasing method other than in-app purchase" (außer US-Storefront). Das External Link Account Entitlement deckt nur **Kontoerstellung und -verwaltung** ab — Apples eigener Beispieltext ist „go to example.com to create or manage your account", ohne Preisangaben, ohne Query-Parameter, ohne Redirects, ohne Webview, blau unterstrichener HTML-Link, einmal pro Seite, statisch in Info.plist. „Upgrade" als CTA ist der konkrete Defekt. Asymmetrie beachten: **Google erlaubt** den Satz „Go to our website to upgrade your subscription to Premium" ausdrücklich, **Apple nicht.**
3. **4.2/4.2.2** — „should include features, content, and UI that elevate it beyond a repackaged website" / „shouldn't primarily be … web clippings, content aggregators". Die Webview-First-Entscheidung sitzt direkt auf dieser Linie, unabhängig von jeder Tier-Frage.

**Empfehlung — vier Punkte:**

- **Die >0-€-Bedingung beibehalten.** Sie ist store-seitig belegt tolerierbar. Wenn 0-€-Mitglieder Zugang bekommen sollen, dann als **Reichweiten-/Produktentscheidung**, ausdrücklich nicht als Compliance-Maßnahme — und die Tier-Schranke dann nur auf Audio/Video, **nie** auf Games.
- **Nicht-Reader-Features aus v1 streichen:** keine Games, keine Kaffeekarten-Punkte, keine Kurs-/Shop-Rabattcodes in der App. Mitmachen nicht als prominenter Top-Level-Tab positionieren. Das ist der billigste und wirksamste Schutz des gesamten Modells.
- **Jeden Upgrade-CTA entfernen.** Ein Screen, neutraler preisfreier Text, kein antippbarer Link: „Ihre Mitgliedschaft umfasst die App nicht. Verwalten Sie Ihre Mitgliedschaft auf correctiv.org." External Link Account Entitlement parallel beantragen — es liefert höchstens den blauen „Konto erstellen oder verwalten"-Link **ohne Parameter und ohne Redirect**, also kein SSO-Handoff nach beabee; der Nutzer loggt sich im Web neu ein. Das muss der Flow von Tag eins an einkalkulieren.
- **Auf Google Play nur Text, kein Link.** Googles Expanded Billing Choice erlaubt seit 30.06.2026 im EWR echte Links — kostet aber 10 % Servicegebühr, und Googles eigene Nutzer-Hilfeseite widerspricht dem Blogpost noch (nennt nur Japan). Bis das konsistent ist: Text.

**Harte Pflichten, unabhängig von allem oben:**

| Pflicht | Quelle | Was das bedeutet |
|---|---|---|
| Demo-Account für App Review | Apple 2.1(a) | **Permanenter** Account in **Produktions**-beabee, >0 € Mitgliedschaft, plus Lokal-Newsletter-Entitlement, immun gegen Zahlungsausfall. Backend-Deliverable, kein Formularfeld. |
| In-App-Kontolöschung | Apple 5.1.1(v) + Play 13327111 | Beide Stores. Apples FAQ schließt die Lücke ausdrücklich: auch wenn die Kontoerstellung „links out to the default web browser", braucht es Löschung **in** der App. Plus öffentliche Web-URL für Löschanträge. Muss über IdP, beabee, WordPress und OneSignal kaskadieren. |
| External Link Account Entitlement | 3.1.3(a) | Beantragen: ja. Wofür: Kontoverwaltung, nicht Upgrade. Pro Bundle-ID — daher zuerst die Bundle-ID entscheiden (aktuell noch `org.correctiv.app.prototype`, verifiziert, und nach Registrierung unveränderlich). |

---

## 5. Empfohlene Architektur

✅ = im Repo umgesetzt (Branch `feature/monorepo-core`, ADR 0001).

```
correctiv-app/                        # ein Repo, npm workspaces          ✅
├── apps/mobile/                      # @correctiv/mobile — NativeScript  ✅
│   ├── nativescript.config.ts  vite.config.ts                            ✅
│   ├── src/platform/                 # EINZIGE Stelle mit NS-SDK-Zugriff
│   │   └── nativescript.ts           #   KeyValueStore · FileStore       ✅
│   ├── src/views/  components/       # Tabs, Reader, Player (bestehend)
│   └── src/stores/                   # audio · feeds · podcasts (NS-nah)
├── apps/web/                         # NEU — Vue 3 + Vite, echtes DOM
│   ├── src/platform/web.ts           #   dieselben Ports, localStorage/IDB
│   └── src/views/                    #   eigene UI, teilbar mit @beabee/vue
├── packages/
│   ├── app-core/                     # NULL Platform-Imports, testerzwungen ✅
│   │   ├── ports/                    #   was der Core vom Host braucht    ✅
│   │   ├── media/exclusive-playback  #   Zyklus audio↔video aufgelöst     ✅
│   │   ├── models · format · lib · services · stores · data              ✅
│   │   ├── time-rules.ts             #   Tageszeit-Logik der Startseite
│   │   └── test/__fixtures__/        #   echte correctiv.org-Captures     ✅
│   ├── tokens/                       # EIN Parser, mehrere Emitter
│   ├── api-client/                   # einzige Netzwerk-Oberfläche der App
│   └── nativescript-vue/             # SLOT für den Fork (ADR 0001)
├── services/bff/                     # NEU — das eigentliche Schwergewicht
│   ├── auth/                         # OIDC-Callback, Token, Refresh, Delete
│   ├── me/entitlements               # beabee → app_access-Claim
│   ├── feed/curated                  # WP-Kurationsseiten → typisiertes Payload
│   ├── articles/ticket               # kurzlebiges ?app_ticket=…&view=app
│   ├── podcasts/                     # Castopod-Proxy → signierte User-URLs
│   └── webhooks/faktenforum          # HMAC claim_published
└── docs/
    ├── adr/                          # 0001 Monorepo ✅ · Reader-Positionierung · KONZEPT-Ablösung
    ├── API-CONTRACT.md               # versioniert, VOR Implementierung
    ├── PARITY.md                     # was das Web-Target NICHT beweisen darf
    └── store-submission-checklist.md
```

**Der Schnitt:** `packages/app-core` ist headless und plattformfrei — erzwungen durch `test/boundary.test.ts`, das in `npm run check` mitläuft und jede Core-Datei auf verbotene Imports scannt. Alles Plattform-Spezifische läuft über die Ports (`src/ports/index.ts`), implementiert je Host in `apps/*/src/platform/`. Der BFF ist die einzige Adresse, die die App kennt — dadurch kostet die nächste Stack-Entscheidung Wochen statt Prototypen.

**Die UI wird zweimal geschrieben, der Rest einmal.** Das ist der Preis dafür, dass NativeScript keinen Web-Renderer hat (Abschnitt 2), und die bewusste Alternative zu einem DOM-Shim über die bestehenden Screens (Abschnitt 8). Weil `apps/web` in Vue entsteht, kann es sich Komponenten mit `@beabee/vue` und den Faktenforum-Nuxt-Frontends teilen — der Aufwand fällt damit nicht nur für die App an.

**Warum der BFF nicht optional ist:** Sechs unabhängige Befunde laufen darauf zu. CORS blockiert das Web-Target. Castopod kann **keine** per-User-Feed-Tokens programmatisch ausstellen (API standardmäßig aus, Community-Tool schreibt direkt in MariaDB) — und auf der Live-Instanz salon5.correctiv.net antworten Media-Dateien auf Range-Requests mit **206 ohne Auth**, ein geteiltes App-Secret ist also wertlos. Faktenforums Hasura hat **keine** anonymous-Rolle, die App kann dort nie direkt anfragen. beabee sendet **keine** Outbound-Webhooks (`apps/webhooks` ist inbound-only), Entitlements müssen serverseitig gepollt werden. Und die Login-Wall-Texte müssen ohne App-Store-Review änderbar sein.

**Wo das Web-Target bewusst nicht lügen darf** (`docs/PARITY.md`, verbindlich): Es darf nicht benutzt werden, um Native↔WebView-Session (Android teilt einen Cookie-Store, iOS hat **zwei**), Background-Audio, Push-Zustellung, Offline-Downloads, Scroll-Performance oder Store-Review-Oberfläche zu beweisen. Nicht-emulierbare Ports rendern einen roten Block „NICHT REPRÄSENTATIV — auf Gerät prüfen". Regel: pro Pull Request ein Maestro-Flow auf einem echten Gerät/Emulator.

---

## 6. Vorbereitungs-Roadmap

Alle Aufwände sind **grobe Schätzungen** in Entwicklertagen. `[NICHT APP]` markiert Arbeit außerhalb des App-Teams.

### Phase 0 — Aufräumen & Fundament (~12 ET)

| # | Ziel | Dateien | ET | Fertig, wenn … |
|---|---|---|---|---|
| 0.1 | Stack-Entscheidung als ADR, Prototyp read-only archivieren, KONZEPT.md ablösen, README korrigieren | `docs/adr/0001…`, `KONZEPT.md`, `README.md` | 1 | ADR protokolliert, inkl. Falsifikationskriterien |
| 0.2 | AGPL-3.0 ablösen, Copyright-Abtretung in Vertragsvorlagen, Test-Keystore + Klartext-Passwort raus | `LICENSE`, `package.json`, `signing/` | 1 | Lizenz entschieden, Keys außerhalb des Repos |
| 0.3 | Bundle-ID, App-Name, publizierende juristische Person festlegen | `nativescript.config.ts` bzw. `app.json` | 0,5 | vor Anlegen der Store-Accounts erledigt |
| 0.4 | `[NICHT APP]` D-U-N-S-Nummer, Apple-Enrollment, EU-DSA-Trader-Status, Entitlement-Antrag | — | 2 | D-U-N-S beantragt (dauert Wochen!) |
| 0.5 | `[NICHT APP]` **Staging-Umgebungen + 8 Test-Identitäten** (0 €, >0 €, nur-Lokal, Manual, expiring, gekündigt-in-Karenz, Geschenk, App-Review) + `docs/API-CONTRACT.md` | — | 3 | kein App-Code gegen Produktion nötig |
| 0.6 | **Entitlement-Matrix** als Wahrheitstabelle (~8 Zahlerzustände × ~6 Oberflächen), gezeichnet von Philipp + beabee-Owner | `docs/entitlements.md` | 0,5 | jede Zelle allow/deny, unterschrieben |
| 0.7 | ✅ **erledigt** — typecheck + **oxlint** + **oxfmt** + Vitest mit echten Fixtures, alles in `npm run check` und als CI-Gate. Offen nur noch: Repo-Governance (CODEOWNERS, Renovate, PR-Template, SECURITY.md) | `package.json`, `.github/` | 0,5 | CI grün, `check` blockiert Merges |
| 0.8 | **Spike targetSdk 36 + Edge-to-Edge** — 2 Stunden, nicht 5 Tage | `app.gradle`, `src/lib/system-bars.ts` | 0,5 | belegt, ob Per-Screen-Tinting überlebt |
| 0.9 | Toter Code + Demo-Ballast weg (~240 LOC ohne Importeure, 4,9 MB Binaries, 30 Snapshots) | `src/data/`, `src/assets/` | 1 | Repo an Externe übergabefähig |

### Phase 1 — Multi-Target-Gerüst (~14 ET)

| # | Ziel | ET | Fertig, wenn … |
|---|---|---|---|
| 1.1 | ✅ **erledigt** — Monorepo-Skelett + `packages/app-core` (34 Dateien, Ports, Zyklus aufgelöst). Offen: den besseren Artikel-Extractor aus dem Expo-Prototyp (htmlparser2 + Allowlists) nachziehen | 4 | `app-core` importiert nichts Plattformspezifisches, per Test erzwungen |
| 1.2 | Token-Pipeline: ein Parser, vier Emitter; `wp-design-tokens` als echtes Submodule (heute nur Nachbarordner-Zufall) | 2 | CI kann Tokens regenerieren |
| 1.3 | **iOS-Kette beweisen:** Bundle-ID festlegen, gemieteten Mac aufsetzen (Scaleway M1, VNC+SSH von Linux), `@nativescript/ios` installieren, erster Build, Install auf einem echten iPhone, dann CI-Archiv → TestFlight | 5 | eine Build läuft auf einem echten iPhone |
| 1.4 | Web-Target aufsetzen: `apps/web` (Vue 3 + Vite), Ports gegen localStorage/IndexedDB implementieren, Reader als `<iframe>`, Feeds über den BFF-Proxy (CORS), erste Screens gegen `@correctiv/app-core` | 5 | `npm run dev -w @correctiv/web` als Tagesloop nutzbar |
| 1.5 | `docs/PARITY.md` + Maestro-Flow-Pflicht pro PR | 1 | CI erzwingt On-Device-Check |
| 1.6 | Accessibility-Grundlage: `accessibilityLabel` für jedes Icon-only-Control als Lint-Regel; Konformanzziel festlegen (BFSG gilt seit 28.06.2025) | 1 | Lint bricht bei unbeschriftetem Icon-Button |

### Phase 2 — Login & Membership (~18 ET)

| # | Ziel | ET | Fertig, wenn … |
|---|---|---|---|
| 2.1 | `[NICHT APP]` Ory Hydra vor dem bestehenden Kratos v1.3 (Faktenforum), Login/Consent-App, WordPress als OIDC-Client | 8 | Discovery-Dokument erreichbar |
| 2.2 | Auth-Spine: OIDC Auth-Code + PKCE (ASWebAuthenticationSession, **nie** versteckte Webview — Apple 5.1.1(vii)), Tokens in SecureStore, 401→Refresh, Deep-Link-Callback | 6 | Login-Roundtrip auf iOS **und** Android |
| 2.3 | Entitlement-Store aus kurzlebigem `app_access`-Claim; `can(entitlement)`; **kein** Boolean | 3 | Matrix aus 0.6 als Test abgedeckt |
| 2.4 | Login-Gate als **Wrapper** (nicht als erste Seite), Blocked-Screen mit neutralem Text, skippbare Join-Survey, In-App-Kontolöschung + Kaskade | 5 | beide Store-Pflichten erfüllt |
| 2.5 | Force-Update/Kill-Switch: `GET /app/config` mit Min-Version + Maintenance-Flag | 1 | alte Clients können gestoppt werden |
| 2.6 | Club-Layer löschen, 18 falsche Texte ersetzen | 3 | keine Paywall-Verneinung mehr im Build |

### Phase 3 — Content-Pipeline (~26 ET)

| # | Ziel | ET | Fertig, wenn … |
|---|---|---|---|
| 3.1 | `[NICHT APP]` **Spike App-View-Template gegen 3 echte Artikel** (Faktencheck, lange Recherche, eine mit Interaktiv). Die Snapshots zeigen Elementor-Wrapper, `corre-abbinder-events`-Ad-Container und Gravity-Forms-Newsletter-Blöcke **mitten im Artikel** — die müssen raus, sonst rendert jeder Artikel ein Newsletter-Formular | 3 | ein sauberer Content-Block bewiesen |
| 3.2 | App-Ticket-Schema: kurzlebiges signiertes `?app_ticket=…&view=app`, WP setzt First-Party-Cookie, versteckt Header, liefert App-CSS. **Keine** Cookie-Injection. Auf echtem iPhone testen | 4 | Walled Content rendert in-App auf iOS |
| 3.3 | Reader: native Chrome + WebView + Bridge (Fortschritt, Save, Follow, Nachricht-an-Autor); Theme in die Webview injizieren; Consent-State durchreichen; Header fix in eigener Zeile | 4 | Scraper (~730 LOC) gelöscht |
| 3.4 | Login-Wall **mit Timer**: Endpoint liefert `access: {state, wallAt}`; vier UI-Zustände spezifiziert (offen vor Ablauf / gespeichert / heruntergeladen / Card-Label) | 3 | kein Zustand undefiniert |
| 3.5 | Startseite: BFF-Kuration + Tageszeit-Regeln + X-Minuten-Refresh; **deterministischer Fallback** bei leerem Payload + Stale-Alert | 5 | Test mit leerem Curation-Payload grün |
| 3.6 | `[NICHT APP]` Kurations-Envelope `{schema: N, modules:[…]}` für **alle** Tabs, `?preview=token`-Modus, Server-Validator | 4 | Redaktion sieht App-Vorschau vor Publish |
| 3.7 | Audio: Background-Playback, Lock-Screen, Downloads-Screen (Größen, Löschen, Cap, WLAN-only, Resume), Castopod über signierte URLs | 6 | Episode spielt gesperrt weiter + offline |
| 3.8 | Push: OneSignal, External ID = beabee-UUID, **grobe** Tags (nie PII), Consent-Gate **vor** SDK-Init (§ 25 TDDDG; OS-Prompt ist nicht die Einwilligung), ein Android-Channel pro Thema | 4 | Themen einzeln stummschaltbar |

### Phase 4 — Beta-Auslieferung (~10 ET)

Observability (Crash + fünf Beta-Metriken, DSFA-Verdikt vorher), Store-Submission-Checkliste (Privacy Manifest `PrivacyInfo.xcprivacy` — fehlt heute komplett und ist ein **Upload**-Blocker; Export-Compliance, Data Safety, Alterseinstufung, Lizenz-Screen für Merriweather/Source Sans/Lucide), Key-Custody-Dokument, Android-Beta via Play Internal Testing (100 Tester, live in Minuten, **kein** Policy-Review), dann TestFlight. Beta-Definition of Done: Kohorte, Erfolgskriterien, Feedback-Kanal, Stop-Bedingung — sonst wird es eine Dauer-Beta.

---

## 7. Dev-Loop auf Linux

**Gemessen auf dieser Maschine (i9-10900K, KVM nutzbar):** Emulator-Kaltstart 21 s, kompletter Redeploy über `scripts/deploy-emulator.sh` **41,5 s** — davon ~12 s ein Vite-Rebundle **ohne** inkrementellen Cache. Der Vite-Dev-Server selbst ist in 1,6 s bereit. Der Emulator ist also nicht der Flaschenhals, das fehlende HMR ist es.

**Was Pascal ab morgen anders macht — vier Loops, nur einer davon ist ein Render-Target:**

1. **Headless (Millisekunden, kein Gerät)** — der größte Einzelgewinn: Vitest über `core` (Stores, Services, RSS-Parser, Artikel-Extractor, **Tageszeit-Regeln**) gegen echte correctiv.org-Fixtures. Der Expo-Prototyp hat das schon: `npm run check` + 12 grüne Tests in 3,1 s. Kopieren, nicht erfinden.
2. **Browser (1,6 s Reload)** — Artikel-Typografie **heute** iterierbar: `apps/mobile/src/assets/reader/reader.css` ist bereits echtes Web-CSS aus den Tokens. Ab Schritt 1.4: `apps/web` (Vue 3 + Vite) für alle neuen Screens, gegen denselben `@correctiv/app-core`.
3. **Emulator-Hygiene, sofort:** das alte AVD löschen (der Name „Medium_Phone" löst auf ein Android-7.0-**32-bit**-Image auf, das die `abiFilters` der App nicht installieren kann), ein AVD `correctiv-dev` (x86_64, `-gpu host`, Quick-Boot-Snapshot behalten). **`deploy-emulator.sh` um eine Logcat-Prüfung auf `NativeScriptException` nach dem Start erweitern** — aktuell meldet das Skript einen Startup-Crash als SUCCESS. Das ist der schlimmste mögliche Signalfehler, besonders für einen unbeaufsichtigten Freelancer oder Agenten.
4. **Echtes Android-Gerät** per `adb pair` (Wireless Debugging) als Fidelity-Referenz für Webview und Audio.

**HMR:** In diesem Repo defekt. `@valor/nativescript-websockets` fehlte, nach Nachinstallation plus Network-Security-Config stürzt es unter **Node 24 und 25** mit `Module evaluation promise rejected: bundle.mjs` ab — dieselbe Signatur wie der Minify-Bug. Behandeln als **eine** Ursache, upstream melden (aktuell ungemeldet), aber als Lotterieticket, nicht als Plan. Mit dem Verbleib auf NativeScript (Rev. 2) bleibt das Thema bestehen — bis dahin ist der Headless-Loop (`npm run check`, 0,4 s) der Ersatz.

**iOS-Realität und die günstigsten Optionen:** Kein Mac kaufen. Reihenfolge nach Kosten:

- **Interaktiver Mac zur Miete — bei Verbleib auf NativeScript der Hauptweg**, weil es kein gehostetes Build-Kontingent wie Expos EAS gibt: siehe Scaleway unten. Damit ist der Mac Werkzeug, nicht Anschaffung.
- **Codemagic** für CI-Archive: 500 freie macOS-M2-Minuten/Monat, dann $0,095/min; Non-Profit-Programm nachfragen.
- **Scaleway — die konkrete Empfehlung:** Mac mini M1, Paris (EU-Jurisdiktion), Xcode vorinstalliert, **VNC + SSH von Linux dokumentiert** (Remmina), €0,11/h bei 24-h-Mindestlaufzeit (**≈ €2,64** für einen Testtag) oder €75/Monat; M4-S €149/Monat. Alternativ MacinCloud $1/h bzw. $25–29/Monat, oder Bitrise Remote Access (SSH/VS Code/VNC während des Builds, per `sleep`-Step verlängerbar).
- **GitHub Actions macOS:** $0,062/min (≈ $0,93 pro 15-min-Archiv), interaktiv per `action-tmate`.
- Test-Build auf ein iPhone bringen geht auch **ohne** TestFlight: `xtool` (`devices`/`install`/`launch`) oder libimobiledevice von Linux.

---

## 8. Aufwandsschätzung & Ressourcen

Alle Zahlen **grobe Schätzungen** in Entwicklertagen.

| Paket | ET | Anteil | Kern |
|---|---|---|---|
| **App-Client** | 75–85 | ~28 % | Login-Gate, Entitlements, IA-Umbau, Reader + Bridge, Startseite + Tageszeit, Audio-Rewrite, Push-Integration, Lokal/Suche/Konto/Mitmachen, iOS-Bring-up, Monorepo + Web-Target |
| **WordPress** | 55–80 | ~25 % | Access-Level-Modell, **serverseitige** Wall + 48h-Timer, App-View-Endpoint + CSS + In-App-Signal, OIDC-Client, neue Taxonomie **plus Nachverschlagwortung des Archivs**, Kurations-Payloads für alle Tabs + Preview, Lokal-Archiv, PN-Textfeld, **Suchmaschine** (WP-Core kann Cross-Type-Ranking nicht — ElasticPress/Typesense/Algolia = neue Infra, neue Kosten, neue DPA), **CDN-Segmentierung** pro Entitlement |
| **beabee** | 45–60 | ~18 % | 3 Tiers + offener Soli (grep: „tier" existiert **nicht** im Code), Spendenfrage + Steuer, Entitlement-API incl. Manual/expiring/Karenz, Saved-Articles-/Profil-/NL-/Themen-APIs, **App-Mode-Kontoseite mit unterdrückten Payment-CTAs** (sonst Play-Verstoß), Outbound-Webhooks, Löschkaskade |
| **BFF + Identity** | 35–45 | ~13 % | Hydra vor Kratos, Login/Consent-UI, Claim-Minter, Castopod-Proxy, beabee-Polling, OneSignal-Targeting, Faktenforum-Webhook, CORS |
| **Drittsysteme/Ops** | 15–20 | ~6 % | OneSignal, Castopod-Instanz, CI, Stores, Signing |
| **Redaktion/Legal** | ~25 (nicht-ET) | — | tägliche Kuration von 6 Tabs, Taxonomie-Design, Wall-Texte, PN-Texte, DSFA, AGB/DSE, Beta-Kohorte |

**Summe ≈ 225–290 ET.** Damit ist die Meeting-Intuition **bestätigt**: WordPress + beabee + BFF (≈ 135–185 ET, ~56 %) wiegen mehr als die App. Aber die unbequeme Ergänzung: Die App ist **nicht** „nur eine Hülle" — Auth, Entitlements, Push, Offline-Audio, das geheime Castopod, der allererste iOS-Build und zwei Store-Releases sind alle greenfield, und **kein** Code-Pfad im Prototyp hat je ein Credential getragen. Und der ~40-ET-BFF-Block (Abschnitt 5) taucht in der bisherigen Paketplanung überhaupt nicht auf.

### Stack-Empfehlung (Rev. 2): bei NativeScript bleiben — mit benanntem Preis

Rev. 1 empfahl den Wechsel zu Expo. Nach Prüfung dreier weiterer Fakten kippt die Empfehlung. Die Argumente, die den Wechsel trugen, sind zwei davon verloren gegangen:

**Was nicht mehr gilt**

- **Governance entscheidet nichts mehr.** React, React Native und JSX wurden im **Februar 2026** an die **React Foundation** unter LF Projects übertragen, mit acht Platinum-Gründungsmitgliedern (Amazon, Callstack, Expo, Huawei, Meta, Microsoft, Software Mansion, Vercel) und einer 5-Jahres-Zusage von Meta über 3 Mio. $. Umgekehrt steht NativeScript bei der OpenJS Foundation nicht auf der Impact-Stufe (das sind Appium, Dojo, Electron, Express, jQuery, Node.js, webpack), sondern auf **At-Large**. Beide Stacks liegen damit in einer neutralen Stiftung — das Kriterium trägt in keine Richtung mehr.
- **Push ist kein Loch.** `@nativescript/firebase-messaging` 5.0.2, `firebase-core` 5.0.2 und `local-notifications` 6.4.0 stammen aus der offiziellen NativeScript-Org und wurden zuletzt am **15.09.2025** veröffentlicht. Es fehlt nur ein **OneSignal**-Client-SDK — eine Werkzeugentscheidung (FCM direkt plus eigene Themenverwaltung, oder FCM-Token serverseitig bei OneSignal registrieren), keine Plattformfähigkeit. Die Behauptung „native Bridge schreiben und jährlich pflegen" war zu stark.

**Was neu dazukommt und schwer wiegt**

- **CORRECTIV ist ein Vue-Haus, verifiziert:** `@faktenforum/frontend`, `publish-sink` und `search-frontend` (je Nuxt 4.5 · Vue 3.5.39 · @nuxt/ui 4.9 · Tailwind 4), `@beabee/frontend` und `frontend-old` (Vue 3.5.34 · Vite 8) — plus **`@beabee/vue`**, ein bereits extrahiertes gemeinsames Komponentenpaket. Pinia steht in App und Faktenforum auf **derselben Minor** (3.0.4). Ein Wechsel zu React hieße, dauerhaft **zwei** Frontend-Skillsets für ein einziges Projekt zu pflegen; jede Vue-Einstellung dagegen bedient App-Web, Login-/Consent-UI, beabee und Faktenforum zugleich.
- **Der Fork ist bezifferbar.** `nativescript-vue` 3.0.2 liefert **1.538 Zeilen** JS aus (Renderer 304, virtuelle Node-Schicht 302, Plugins 213, Top-Level 201, nativescript 188, Komponenten 187, Direktiven 81, Registry 54), MIT, gegen das vom Vue-Kernteam gepflegte `@vue/runtime-core`. Das ist eine Versicherung, die man abschließen kann — kein „wir pflegen Vue".

**Was bestehen bleibt** — und den Preis ausmacht: der Wunsch „ein Codebase, drei Targets" ist mit NativeScript strukturell unerfüllbar (Abschnitt 2). Das Web-Target muss gebaut statt geschenkt werden. Der Schritt ist bereits getan: `packages/app-core` ist plattformfrei, headless getestet und trägt 34 Dateien; die Web-UI kommt separat, in Vue, teilbar mit beabee und Faktenforum.

**Der Preis, benannt — sonst ist es keine Entscheidung, sondern Trägheit:**

1. `nativescript-vue` vendoren und fork-bereit halten (Prozedur in ADR 0001).
2. Jährliches Budget für OS-Anpassungen einplanen — genau die Sorge aus dem Meeting, jetzt als Posten statt als Risiko.
3. `@nstudio/nativescript-exoplayer` (2023) und `@nativescript/social-share` (2022) ersetzen, bevor sie brechen.
4. Einen Mac mieten, sobald iOS ansteht — €75/Monat, keine Diskussion darüber, ob man ihn braucht.

**Das Gate — ein 2-Tage-Spike, jetzt gegen NativeScript statt gegen Expo:** Kann der Audio-Stack einen Stream mit **Authorization-Header** abspielen — im Hintergrund, mit Lock-Screen-Controls, und heruntergeladen offline? Das ist die einzige verbliebene harte Bruchstelle: Der Scope verlangt ein Castopod hinter Secret-Auth, `@nativescript-community/audio` kann keine HTTP-Header setzen, und der iOS-Livestream ist laut Code-Kommentar kaputt. Wenn das nur mit selbstgeschriebenen Native-Modulen auf beiden Plattformen geht, kehrt das Wechsel-Argument mit voller Kraft zurück — native Audio-Module sind deutlich teurer als Push.

**Ein DOM-Shim über die bestehenden Screens bleibt eine Falle:** 17 Element-Namen sind eine Woche, aber 326 globale CSS-Klassen über 2.097 LOC NativeScript-Dialekt-SCSS (unitlose Dips wie `padding: 2 8`, `vertical-align`/`horizontal-align` als View-Properties ohne CSS-Äquivalent) sind eine dauerhafte Doppelpflege — genau daran ist `nativescript-vue-web` im Januar 2019 gestorben. Die Web-UI wird separat geschrieben, gegen den geteilten Core.

**Wer baut:** in-house + **ein** Freelancer, ab Phase 1. Kern-Produkte im Haus zu halten ist richtig, aber Bus-Faktor 1 ist das leiseste Risiko auf dieser Liste — Pascal ist der einzige Mensch, der diese App je gebaut hat, und in keinem Plan steht, wer seinen Code reviewt oder wer sonst ein Release schneiden kann. Eine Agentur ist für WordPress/beabee wahrscheinlich wertvoller als für die App. AI kann die Phasen 0–1 sinnvoll tragen (mechanische Arbeit, klare Verträge), nicht die iOS-Session-Frage.

---

## 9. Entscheidungen, die CORRECTIV treffen muss

| Entscheidung | Wer | Blockiert | Bis wann |
|---|---|---|---|
| Framework **bestätigen**: NativeScript bleibt (Rev. 2), Gate ist der Audio-Spike | Meeting-Gruppe + Pascal | **alles** | KW 32 |
| **Reader-App-Positionierung: welche Nicht-Reader-Features fallen aus v1** (Games, Kaffeekarte, Kurs-/Shop-Rabatte) | Max + Sara | ganzes No-IAP-Modell | KW 32 |
| Entitlement-Matrix (~8 Zahlerzustände × ~6 Oberflächen) | Philipp + beabee-Owner | Auth-Spine, Lokal-Tab | KW 32 |
| Bundle-ID, App-Name, publizierende Rechtsperson | Pascal + Max | Store-Accounts, Apple-Entitlement (unveränderlich!) | KW 32 |
| AGPL-3.0 ablösen + Copyright-Abtretung in Verträge | Legal + Max | jeder externe Commit, iOS-Release | KW 32 |
| Identity-Provider (Hydra vor Kratos oder Alternative) | Pascal + Faktenforum-Ops | Login, Website-SSO | KW 33 |
| Gibt es einen BFF, wer hostet, wer hat Bereitschaft | Benjamin/IT | 3 App-Pakete | KW 33 |
| Staging-Umgebungen + 8 Test-Identitäten + API-Contract | Benjamin + Philipp | jede Login-/Wall-Arbeit | KW 33 |
| Dürfen 0-€-Mitglieder in die App (**Produktfrage**, nicht Store-Frage) | Max + Philipp | Login-Copy, IA | KW 34 |
| Redaktionelles Betriebsmodell: wer kuratiert 6 Tabs täglich, mit welchem Tool, was passiert an unbesetzten Tagen | Sara | Startseite, Beta-Wert | KW 34 |
| Offline-Artikellesen in v1: ja/nein (widerspricht der Webview-Entscheidung) | Produkt | Reader-Architektur | KW 34 |
| Analytics/Crash-Anbieter + Consent-Modell + **DSFA-Schwellenprüfung** | DSB + Pascal | Beta-Messbarkeit | KW 34 |
| Accessibility-Konformanzziel (BFSG seit 28.06.2025) | Max + Legal | Komponenten-Design | KW 34 |
| Beta: Kohorte, Erfolgskriterien, Stop-Bedingung, Feedback-Kanal | Produkt | Phase 4 | KW 35 |
| Wer reviewt Freelancer-Code, wer ist die zweite Release-fähige Person | Caro + Pascal | Bus-Faktor 1 | KW 35 |

---

## 10. Risiken

| Risiko | Wahrsch. | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| **Reader-App-Status wird wegen Mitmachen-Features verweigert** → Apple fordert IAP für die Mitgliedschaft | mittel | **kritisch** (Modell kippt) | Games/Punkte/Rabatte aus v1 streichen; Mitmachen nicht prominent; App-Review-Note zu 3.1.3(a) schreiben; schriftliche Bestätigung über den Entitlement-Antrag einholen |
| 4.2/4.2.2-Ablehnung: Login-Wall + Webview-Content sieht wie „repackaged website" aus | mittel-hoch | hoch | Native Tabs, native Audio mit Background + Download, Push, Saved Articles, Deep Links **in** der Beta; ein voll natives Tab; Ablehnungs-/Einspruchszyklus einplanen |
| 5.1.1(v)-Ablehnung wegen Registrierungspflicht | mittel | hoch | Argument (signifikante kontobasierte Features) vorab schriftlich; Demo-Account in Produktion; Gate als Wrapper, damit später ein Preview-Modus einsetzbar ist |
| **Upload-Blocker Privacy Manifest** (`PrivacyInfo.xcprivacy` fehlt komplett) | hoch | mittel | im selben Sprint wie der Platform-Seam schreiben; „liefert dieses SDK ein Privacy Manifest?" in die Dependency-Checkliste |
| iOS Native↔WebView-Session scheitert (iOS hat **zwei** Cookie-Stores, ITP blockt Auth-Cookies bei CORS) | mittel | hoch | signiertes `app_ticket` in der URL statt Cookie-Injection; Spike auf gemietetem Mac **früh**, nicht spät |
| **NativeScript-Langlebigkeit**: Bus-Faktor 1–2, `nativescript-vue` seit 10/2025 ohne Commit, 99k vs 43,7M Downloads/Monat | hoch | hoch | Fork vorbereiten (1.538 LOC, ADR 0001); jährliches OS-Anpassungsbudget; Plugin-Ersatz für exoplayer (2023) und social-share (2022); Core plattformfrei halten, damit ein späterer Wechsel Wochen statt Prototypen kostet |
| Play-Deadline API 36 (31.08.2026) wird verpasst | mittel | hoch | 2-h-Spike in KW 32; falls Edge-to-Edge nicht trägt: Per-Screen-Tinting **als Produktänderung** fallen lassen |
| Kein Staging → Tests gegen echte Mitgliedschaften, Wall-Bug sperrt Zahlende aus | **hoch** | hoch | Phase 0.5 als Woche-1-Deliverable mit Owner |
| WordPress/beabee/BFF verzögern; App-Team blockiert | hoch | mittel | Sequenzieren nach API-Contract; Parallelarbeit auf Audio + Web-Harness; Freelancer ggf. auf WordPress statt App |
| Redaktionelle Kapazität fehlt → App startet mit leerer Startseite | mittel | hoch | Betriebsmodell + unbesetzter-Tag-Fallback vor der Beta |
| „Nachricht an Autor:in" wird als sicherer Tipp-Kanal missverstanden | mittel | hoch (Quellenschutz) | aus v1 streichen **oder** mit hartem Disclaimer, Rate-Limit, Löschfrist und Freigabe der/des Quellenschutz-Verantwortlichen |
| Kein Force-Update: alte Clients brechen bei Contract-Änderung | mittel | mittel | `GET /app/config` Min-Version + Maintenance-Flag in v1 |
| Bus-Faktor 1 in-house | hoch | hoch | zweite release-fähige Person benennen und einarbeiten |

---

## 11. Nächste 5 Schritte (diese Woche)

1. **D-U-N-S-Nummer beantragen** und Apple-/Play-**Organisations**-Accounts anstoßen — dauert Wochen, blockiert TestFlight komplett, und ein Org-Account befreit zusätzlich von Googles 12-Tester/14-Tage-Regel.
2. **2-Tage-Audio-Spike auf NativeScript:** Background-Playback + Lock-Screen + **authentifizierter** Stream (Authorization-Header!) + Offline-Download auf einem echten Android-Gerät. Das ist die letzte offene Bruchstelle der Stack-Entscheidung.
3. **2-Stunden-Spike targetSdk 36 + Edge-to-Edge** auf Core 9.0.20 — Ergebnis bestimmt, ob wir einen Bug fixen oder ein Feature streichen.
4. **Ein Termin, vier Beschlüsse:** Reader-App-Positionierung (welche Features fallen), Entitlement-Matrix (90 Minuten, Wahrheitstabelle), Bundle-ID/Rechtsperson, AGPL-Ablösung. Protokollieren.
5. **`scripts/deploy-emulator.sh` um die Logcat-Crash-Prüfung erweitern**, altes 32-bit-AVD löschen, `check`-Script + CI-Gate mit dem bereits grünen Typecheck einschalten — ein halber Tag, und der Loop lügt danach nicht mehr.

---

## 12. Quellen

**NativeScript-Plattformen** · Live: `ns platform add linux|macos` (CLI 9.0.6) → „Valid platforms are iOS, Android or visionOS" · [docs/content/index.md](https://github.com/NativeScript/docs/blob/main/content/index.md) · [Discussion #10622](https://github.com/orgs/NativeScript/discussions/10622) (Maintainer lehnt Web-Runtime ab) · [Issue #6845](https://github.com/NativeScript/NativeScript/issues/6845) (offen seit 30.01.2019) · [Issue #27](https://github.com/NativeScript/NativeScript/issues/27) (Desktop, offen seit 01.04.2015) · [@nativescript/nx](https://github.com/NativeScript/nx) (`'angular' | 'vanilla'`, `// TODO: support … vue`) · [Nativescript-Vue-Web](https://github.com/Nativescript-Vue-Web/Nativescript-Vue-Web) (archiviert 19.05.2026) · [nativescript-web-adapter](https://www.npmjs.com/package/nativescript-web-adapter) (62 Downloads/Monat) · [runtime-node-api](https://github.com/NativeScript/runtime-node-api) (nur Objective-C) · Contributor-Graph NativeScript/NativeScript · [nativescript-vue](https://github.com/nativescript-vue/nativescript-vue) (letzter Commit 17.10.2025)

**Apple** · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.1, 3.1.3, 3.1.3(a)/(b)/(f), 4.2, 4.2.2, 5.1.1(v)/(vii)/(x), 2.1(a)) · [Reader Apps / External Link Account Entitlement](https://developer.apple.com/support/reader-apps/) · [Ankündigung 30.03.2022](https://developer.apple.com/news/?id=grjqafts) · [Account Deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) · Ablehnungen: [Forum 720232](https://developer.apple.com/forums/thread/720232), [811018](https://developer.apple.com/forums/thread/811018), [759323](https://developer.apple.com/forums/thread/759323) (Reader-Status) · [EU External Purchase Link](https://developer.apple.com/support/communication-and-promotion-of-offers-on-the-app-store-in-the-eu/) · [Xcode SLA](https://www.apple.com/legal/sla/docs/xcode.pdf) („ONLY ON AN APPLE-BRANDED PRODUCT RUNNING MACOS")

**Präzedenzfälle** · [Republik (App Store DE)](https://apps.apple.com/de/app/republik/id1392772910) + [republik.ch/faq](https://www.republik.ch/faq) · [Krautreporter Audio](https://apps.apple.com/de/app/krautreporter-audio/id1576669504)

**Google** · [Payments/consumption-only](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) · [Account Deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) · [targetSdk-Fristen](https://support.google.com/googleplay/android-developer/answer/11926878) · [Expanded Billing Choice, 30.06.2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html) — widerspricht noch [Hilfeseite 16805335](https://support.google.com/googleplay/answer/16805335?hl=en)

**Infrastruktur & Recht** · [Scaleway Apple Silicon](https://www.scaleway.com/en/pricing/apple-silicon/) + [VNC von Linux](https://www.scaleway.com/en/docs/apple-silicon/) · [Codemagic Pricing](https://codemagic.io/pricing/) · [GitHub Actions Runner Pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing) · [xtool](https://github.com/xtool-org/xtool) · [DSK Orientierungshilfe digitale Dienste v1.2](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) (Push + Login-Bereiche = Zusatzfunktionen) · [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html) · [OneSignal DPA](https://onesignal.com/dpa) + [Mobile SDK Reference](https://documentation.onesignal.com/docs/en/mobile-sdk-reference) (kein NativeScript-SDK)

**Governance & Ökosystem (Rev. 2)** · [React Foundation (react.dev, 07.10.2025)](https://react.dev/blog/2025/10/07/introducing-the-react-foundation) · [Linux Foundation: Formation of the React Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-react-foundation) · [Meta Engineering: New Home for React & React Native](https://engineering.fb.com/2025/10/07/open-source/introducing-the-react-foundation-the-new-home-for-react-react-native/) · [OpenJS Foundation Projects](https://openjsf.org/projects) (NativeScript = At-Large; Impact = Appium, Dojo, Electron, Express, jQuery, Node.js, webpack) · `npm view @nativescript/firebase-messaging` → 5.0.2, 15.09.2025

**Lokal verifiziert (Rev. 2)** · Vue-Bestand: `@faktenforum/{frontend,publish-sink,search-frontend}` (Nuxt 4.5), `@beabee/{frontend,frontend-old,vue}` (Vue 3.5.34) · `nativescript-vue` dist = 1.538 LOC · Monorepo-Umbau: `npm run check` 82 Tests/0,4 s, `vite build` 590 Module/10,3 s, `ns build android` 28,6 s (APK 114 MB) · `@nativescript/vite` `configuration/base.js:79` kapert `packages/core`

**Lokal verifiziert** (31.07.2026, Repo `app-prototype`, HEAD d3571cc) · `npx tsc --noEmit` und `npx vue-tsc --noEmit` → Exit 0 · `nativescript.config.ts:4` → `id: 'org.correctiv.app.prototype'` · `package.json` → `"license": "AGPL-3.0-or-later"` · `app.gradle` → `targetSdkVersion 34`, `compileSdkVersion 35` · SCSS = 2.097 LOC · `grep accessibilityLabel|automationText|accessible=` → 0 · `grep i18n` → 0 · `App_Resources/iOS/` ohne `PrivacyInfo.xcprivacy` · `.github/` nur `workflows/` · Emulator 21 s Kaltstart, Redeploy 41,5 s, Vite-Dev-Server 1,6 s · `expo export -p web` (Schwester-Repo) → Exit 0, 13 Routen