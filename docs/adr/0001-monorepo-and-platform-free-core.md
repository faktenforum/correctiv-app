# ADR 0001 — npm-Workspace mit plattformfreiem Core

**Status:** angenommen · **Datum:** 2026-08-01 · **Betrifft:** Repo-Struktur, Dev-Loop, Fork-Strategie

## Kontext

Der Prototyp war ein einzelnes Paket: NativeScript-App im Repo-Root, alles in `src/`.
Drei Anforderungen sprengen das:

1. **Dev-Loop ohne Emulator.** Gemessen auf der Entwicklungsmaschine: kompletter Redeploy
   41,5 s, Emulator-Kaltstart 21 s, HMR im Repo defekt. Der größte verfügbare Hebel ist,
   die plattformfreie Hälfte des Codes headless testbar zu machen — Millisekunden statt
   Sekunden, ohne Gerät.
2. **Web-Referenz-Target.** NativeScript hat keinen Web-Renderer (siehe `APP-STRATEGIE.md`
   §2). Ein Web-Build ist deshalb nur über einen geteilten Kern plus separat
   implementierte Web-UI erreichbar — der Kern muss dafür existieren.
3. **Forks als Workspace-Pakete.** `nativescript-vue` hat einen Maintainer und seit dem
   17.10.2025 keinen Commit. Das Paket ist mit 1.538 Zeilen ausgeliefertem JS klein genug,
   um es notfalls selbst zu pflegen. Diese Option soll vorbereitet sein, bevor sie
   gebraucht wird.

## Entscheidung

npm-Workspaces, zwei Pakete:

```
correctiv-app/
├── package.json              # Workspace-Root, delegierende Skripte, kein Code
├── tsconfig.base.json        # geteilte Compiler-Optionen
├── apps/mobile/              # @correctiv/mobile — die NativeScript-App
│   └── src/platform/         # die EINZIGE Stelle mit NativeScript-SDK-Zugriff des Cores
└── packages/app-core/        # @correctiv/app-core — plattformfrei, headless testbar
    ├── src/ports/            # was der Core vom Host braucht
    └── test/                 # Vitest + echte correctiv.org-Fixtures
```

**Ports statt Imports.** Der Core importiert kein Plattform-SDK. Was er vom Host braucht,
steht als Interface in `packages/app-core/src/ports/index.ts` (`KeyValueStore`,
`FileStore`) und wird beim Start über `configurePlatform()` übergeben — in
`apps/mobile/src/app.ts`. Ohne Registrierung fällt der Core auf eine In-Memory-Variante
zurück, damit Tests und Tooling keine Einrichtung brauchen.

**Die Grenze ist getestet, nicht nur dokumentiert.** `packages/app-core/test/boundary.test.ts`
scannt jede Core-Quelldatei auf verbotene Imports (`@nativescript/*`, `@nstudio/*`,
`nativescript-vue`, `react-native`, `expo`, `node:*`) und läuft in `npm run check` mit.
Die Korrektur bei einem Fehlschlag ist **nie**, die Allow-List zu erweitern, sondern den
Code in einen Host zu verschieben und den Bedarf als Port zu deklarieren.

**Zyklen aufgelöst statt verschoben.** `stores/audio` und `stores/video` koordinierten
gegenseitigen Ausschluss über `await import()` aufeinander — ein zur Laufzeit gebrochener
Modulzyklus. Ersetzt durch `media/exclusive-playback.ts`: jedes Medium registriert einen
Stop-Callback, ein startendes Medium stoppt die anderen. Kein Store importiert einen
anderen; ein drittes Medium (Game, Livestream) kommt ohne Änderung an den bestehenden dazu.

## ⚠️ Das Verzeichnis heißt `packages/app-core`, nicht `packages/core` — mit Absicht

`@nativescript/vite` 2.0.3, `configuration/base.js:79`:

```js
// Prefer monorepo source (packages/core) when present to match webpack5 behavior,
// else fall back to node_modules resolution.
const workspaceCorePkg = path.resolve(projectRoot, '../../packages/core/package.json');
if (existsSync(workspaceCorePkg)) {
    NS_CORE_ROOT = path.dirname(workspaceCorePkg).replace(/\\/g, '/');
}
```

Das Plugin nimmt an, `<app>/../../packages/core` sei der **NativeScript-Core-Quellcheckout** —
so ist das NativeScript-Repo selbst aufgebaut. In jedem Workspace mit `apps/*` und einem
Verzeichnis `packages/core` kapert es damit `@nativescript/core`: `NS_CORE_ROOT` speist drei
Alias-Einträge, und der Build stirbt mit
`Could not load .../packages/core/globals (imported by virtual:entry-with-polyfills)`.

Verzeichnis- und Paketname stimmen deshalb überein (`packages/app-core` ↔
`@correctiv/app-core`), damit niemand das Verzeichnis „der Konsistenz halber" zurück
benennt und die Falle stillschweigend wieder scharf macht.

**Offen:** upstream melden. Wie der Minify-Crash (`vite.config.ts`) ist das bislang nicht
gemeldet.

## Forks als Workspace-Pakete pflegen

Der Workspace ist so aufgesetzt, dass ein Fork ein Paket wie jedes andere wird. Vorgehen am
Beispiel `nativescript-vue` (1.538 LOC ausgeliefertes JS, MIT):

1. Quellen nach `packages/nativescript-vue/` legen (Upstream-Repo klonen, `.git` entfernen,
   Upstream-Commit-SHA in der README des Pakets festhalten).
2. `"name"` im Paket unverändert lassen (`nativescript-vue`) — npm-Workspaces hängen den
   lokalen Ordner dann automatisch vor die Registry-Version, ohne dass ein einziger Import
   im App-Code geändert werden muss.
3. In `apps/mobile/package.json` die Abhängigkeit auf `"*"` setzen.
4. `npm install`, dann `npm run check` und einen echten Android-Build fahren.
5. Änderungen gegenüber Upstream in `packages/nativescript-vue/PATCHES.md` dokumentieren —
   sonst ist der nächste Upstream-Merge nicht mehr rekonstruierbar.

Ein Verzeichnisname, der mit `core` endet, ist dabei zu vermeiden (siehe oben).

## Konsequenzen

**Gewonnen**

- `npm run check` = beide Typechecks + 82 Tests in **~0,4 s**, ohne Gerät. Der Loop, der
  vorher 41,5 s brauchte, deckt damit die Datenschicht, die Parser und die Ports ab.
- 34 Quelldateien sind ab sofort nachweislich plattformfrei und stehen einem Web-Target
  oder einem Stack-Wechsel unverändert zur Verfügung.
- Die Feed- und Artikel-Parser sind gegen echte correctiv.org-Captures gepinnt. Sie sind
  regex-basiert und brechen bei einer WordPress-Theme-Änderung still — das ist jetzt die
  Frühwarnung.

**Bezahlt**

- Zwei `package.json`, zwei tsconfigs, ein Alias in `vite.config.ts`.
- Der Core wird als TypeScript-Quelle konsumiert (kein Build-Schritt). Deshalb ist die
  Auflösung über einen Vite-Alias fest verdrahtet statt über die Workspace-Symlinks — die
  Subpath-Exports sind endungslos, was Node-Resolution nicht auflösen würde.
- CI-Pfade (`NS_VITE_DIST_DIR`) und die Node-Skripte zeigen jetzt auf `apps/mobile/`.

**Unverändert**

- Ein vorbestehender `vue-tsc`-Fehler in `app.ts` (`AndroidActivityBackPressedEventData`)
  tritt nur im ns-vite-Lauf auf, der `--moduleSuffixes` für die Android-Typauflösung setzt.
  Gegen `main` verifiziert: identisch vorhanden, nicht durch diesen Umbau verursacht. Der
  Build läuft in beiden Fällen durch (10,8 s).
