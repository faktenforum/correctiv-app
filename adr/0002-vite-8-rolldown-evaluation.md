# ADR 0002 — Vite 8 / Rolldown: gemessen, noch nicht übernommen

**Status:** abgelehnt für jetzt, erneut prüfen · **Datum:** 2026-08-01 · **Betrifft:** Bundler, Build-Zeit, zwei offene Upstream-Blocker

## Kontext

Zwei der vier in `APP-STRATEGIE.md` §3 dokumentierten Blocker hängen am Bundler:
Release-Builds funktionieren nur mit **abgeschalteter Minification** (ein minifiziertes
Bundle stürzt beim Start ab), und **HMR ist defekt** — beides mit derselben Signatur
`Module evaluation promise rejected: bundle.mjs`.

Vite 8 ersetzt esbuild + Rollup durch **Rolldown**, also genau die Pipeline, in der
dieser Fehler sitzt. Das war es wert, gemessen statt vermutet zu werden.

Vorlage war das Schwesterprojekt **[gjsify](https://github.com/gjsify/gjsify)** (MIT), das
in `@gjsify/nativescript-vite` denselben Weg bereits gegangen ist: dort läuft ein
NativeScript-Integrationstest auf `@nativescript/vite@2.0.3` **zusammen mit `vite@^8`**.

## Was geprüft wurde

Zwei Wege, beide auf diesem Projekt, beide bis zum echten `ns build android`:

1. **`@nativescript/vite@8.0.0-beta.0`** (`vite: ^8.0.0`, die native Rolldown-Linie).
   Scheitert sofort: `Could not resolve entry module "index.html"`, 0 Module
   transformiert — **auch mit der unveränderten Plugin-Config** und über den echten
   CLI-Pfad. Also nicht unsere Konfiguration, sondern die Beta.
2. **`@nativescript/vite@2.0.3` + `vite@8.2.0`** per npm-`overrides`, mit den drei
   Eingriffen aus gjsify:
   - Funktions-`resolve.alias`-Einträge entfernen (Rolldown lehnt sie ab),
   - `@rollup/plugin-commonjs` entfernen (crasht Rolldown mit
     `Cannot read properties of undefined (reading 'currentLoadingModule')`),
   - den bundler-seitigen `ns-vue-tsc-check` entfernen (ein Bundler soll bündeln;
     der maßgebliche Gate ist `npm run check`).

   Zusätzlich nötig, weil Vite 8 die esbuild-Optionen des Plugins **ignoriert** und es
   sich mit `build.target: 'esnext'` auf `esbuild.target: 'es2020'` verlässt:
   `build.target: 'es2020'` und `oxc.keepNames: true` explizit setzen.

## Ergebnis: es funktioniert — und löst tatsächlich einen Blocker

| | Vite 7 / Rollup | Vite 8 / Rolldown |
|---|---|---|
| `vite build` | 10,3 s | **1,5 s** |
| `bundle.mjs` | 415,0 kB | 352,5 kB |
| `vendor.mjs` | 2.670,7 kB | 2.350,2 kB |
| `ns build android` (clean) | 28,6 s | 26,1 s |
| **Minification** | Start-Crash | **funktioniert** |

Der minifizierte Build wurde auf dem Emulator (API 36) installiert und gestartet:
Prozess lebt, `topResumedActivity` ist die NativeScriptActivity, **keine**
`NativeScriptException`, **keine** `Module evaluation promise rejected`. Minifiziert
schrumpft das Bundle auf 181,8 kB und der Vendor-Chunk auf 1.229,9 kB — grob die Hälfte.

**Der seit langem dokumentierte Minify-Crash ist unter Rolldown weg.**

## Warum es trotzdem nicht übernommen wird

Der Build ist grün, die App startet — **und der gesamte Netzwerk-Layer ist tot.** Im
logcat, bei jedem Feed:

```
E JS : CONSOLE ERROR: Feed fetch 'recherchen' failed: XMLHttpRequest is not defined
```

Die NativeScript-Polyfills landen nicht im Bundle. Gezählt im emittierten Vendor-Chunk:

| | Vite 7 | Vite 8 |
|---|---|---|
| `installPolyfills` | 12× | **0×** |
| `XMLHttpRequest` | 25× | 2× |

Gegen eine **Baseline auf demselben Emulator** geprüft: mit Vite 7 null solche Fehler,
App läuft normal. Es ist also eine Regression der Vite-8-Konfiguration, kein Bestandsbug.

Zwei Hypothesen wurden getestet und **beide widerlegt**:

- *Rolldown shakt den Nebeneffekt-Import weg* → `treeshake: { moduleSideEffects: true }`
  in `build.rollupOptions` ändert nichts (`installPolyfills` bleibt 0).
- *Der verworfene Funktions-Alias `@nativescript/core/(.+)/index` bricht die Auflösung
  von `@nativescript/core/globals/index`* → in die von Rolldown akzeptierte String-Form
  mit `$1`-Rückverweis umgeschrieben, gegen den echten `@nativescript/core`-Pfad; ändert
  ebenfalls nichts.

Die Ursache liegt also woanders — vermutlich in der Art, wie Rolldown das
`virtual:entry-with-polyfills`-Modul des Plugins behandelt. Weiterzusuchen war an dieser
Stelle nicht gerechtfertigt: der Nutzen ist real, aber der Umbau darf den Datenlayer
nicht kosten.

## Entscheidung

**Bei `@nativescript/vite@2.0.3` / Vite 7 bleiben.** Minification bleibt aus.

## Erneut prüfen, wenn

- `@nativescript/vite@8.x` die Beta verlässt — dann entfallen die Eingriffe (1) und (2)
  ohnehin, und der Polyfill-Pfad ist upstream neu geschrieben;
- oder wenn gjsify das Polyfill-Problem löst (dort läuft ein NativeScript-Smoke-Test
  gegen Vite 8, der genau diese Frage berührt).

Der Gewinn wäre erheblich: **7× schnellere Builds, ~15 % kleinere Bundles und die
Erledigung von zwei der vier Blocker in einem Zug.** Die Konfiguration ist in der
Historie dieses Branches erhalten und in diesem Dokument vollständig beschrieben.

## Nebenbefund

Der bundler-seitige `ns-vue-tsc-check` ist die Quelle der langjährigen, scheinbar
unerklärlichen `AndroidActivityBackPressedEventData`-Meldung in `app.ts`: Er startet ein
**eigenes** TypeScript-Programm mit `--moduleSuffixes` für die Android-Typauflösung,
dessen Ergebnis von der tsconfig der App abweicht. Entfernt man den Plugin-Eintrag,
verschwindet die Meldung — ohne dass ein echter Typfehler verdeckt würde, denn
`npm run check` (tsc + vue-tsc) läuft weiterhin und ist grün. Das ist unabhängig von
Vite 8 anwendbar, falls die Meldung stört.
