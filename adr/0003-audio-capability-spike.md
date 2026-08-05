# ADR 0003 — Audio-Spike: NativeScript kann, was der Scope verlangt (Android)

**Status:** Gate bestanden · **Datum:** 2026-08-01 · **Betrifft:** Stack-Entscheidung, Audio-Architektur

## Warum dieser Spike

`APP-STRATEGIE.md` §8 macht die Empfehlung „bei NativeScript bleiben" von genau einer
Prüfung abhängig — der letzten offenen Bruchstelle:

> Kann der Audio-Stack einen Stream mit **Authorization-Header** abspielen — im
> Hintergrund, mit Lock-Screen-Controls, und heruntergeladen offline?

Der Anlass: das eingesetzte Plugin `@nativescript-community/audio` bietet **keine**
Header-Option. `AudioPlayerOptions` kennt `audioFile`, `loop`, `autoPlay`, `metering`,
`pitch`, die Callbacks, `audioMixing`, `seek`, die iOS-Session-Optionen, `audioStreamType`
und `dataSource` — nichts für HTTP-Header. Der Scope verlangt aber ein „separate Castopod
behind secret auth that only the app can talk to". Ohne Header keine exklusiven Podcasts.

## Aufbau

`apps/mobile/scripts/spike-audio-server.mjs` liefert die gebündelte Beispielepisode und
**verlangt `Authorization: Bearer spike-token`; ohne Header 401**. Damit ist ein
bestandener Test ein Beweis, kein Zufall. Range-Requests werden unterstützt, weil Androids
MediaPlayer sie stellt.

`apps/mobile/src/spike/audio-spike.ts` fährt die Tests gegen die **Plattform-API direkt**,
am Plugin vorbei, und loggt mit dem Präfix `SPIKE:`. Einschalten: `RUN_AUDIO_SPIKE = true`
in `src/app.ts` (Standard `false`), Server starten, deployen, `adb logcat | grep SPIKE:`.

## Ergebnisse — alle bestanden, auf Android

| Test | Ergebnis | Beleg |
|---|---|---|
| T1 Server erzwingt Auth | **PASS** | ohne Header verweigert; Server-Log zeigt `ua=stagefright/1.2` → 401 |
| T2 Authentifizierter Stream spielt | **PASS** | `isPlaying=true pos=1454ms duration=97475ms` |
| T3 MediaSession (Lock-Screen) | **PASS** | System: `Media button session is org.correctiv.app.prototype/CorrectivSpikeSession`, `state=PLAYING(3)`, `metadata: CORRECTIV Spike-Episode, Salon5` |
| T4 Authentifizierter Download | **PASS** | `ua=AndroidDownloadManager/16` mit Header → 200; Datei vollständig (779.800 Bytes) |
| T5 Hintergrund-Wiedergabe | **PASS** | nach HOME lief die Position weiter: 11,5 s → 31,5 s, Session aktiv |

Serverseitig, also unabhängig vom Client bestätigt:

```
[16] GET /audio.mp3 | authorization=Bearer spike-token | range=bytes=517528- | ua=stagefright/1.2  -> 206
[18] GET /audio.mp3 | authorization=Bearer spike-token | ua=AndroidDownloadManager/16              -> 200
```

**Es braucht kein natives Modul.** Alles läuft in TypeScript über die von NativeScript
exponierte Android-API.

## Zwei NativeScript-Fallen, die dabei gefunden wurden

**1. Überladungsauflösung bei zwei Argumenten.** `setDataSource(String, Map<String,String>)`
existiert und ist typisiert — aber der Aufruf **killt den Prozess**:

```
JNI DETECTED ERROR IN APPLICATION: bad arguments passed to
void android.media.MediaPlayer.setDataSource(android.content.Context, android.net.Uri)
```

NativeScripts Laufzeitauflösung kann `(String, Map)` nicht von `(Context, Uri)`
unterscheiden und wählt die falsche — derselbe Fehlgriff, den auch `tsc` macht. Die
**dreiargumentige** Form `setDataSource(Context, Uri, Map)` ist eindeutig, braucht keinen
Cast und funktioniert.

**2. Abstrakte Java-Klassen brauchen `.extend()`.** `new MediaSession.Callback({ onPlay })`
scheitert mit `Cannot marshal JavaScript argument [object Object] at index 0 to Java type.`
Richtig ist `MediaSession.Callback.extend({ onPlay, onPause })`, dann `new Impl()`.

Beide sind in `audio-spike.ts` kommentiert, damit die spätere Produktionsimplementierung
nicht dieselben zwei Tage verliert.

## Was das NICHT beweist

- **Nur Android.** iOS ist ungeprüft. Dort ist der Weg ein anderer: `AVURLAsset` mit
  `AVURLAssetHTTPHeaderFieldsKey` für die Header, `MPNowPlayingInfoCenter` +
  `MPRemoteCommandCenter` statt MediaSession, und der `audio`-Background-Mode in der
  Info.plist. Der Code-Kommentar im Repo sagt zudem, dass `AVAudioPlayer` keine
  Live-Streams kann. **Das ist der nächste Spike** — der Aufwand ist damit nicht bewiesen,
  nur plausibel.
- **T5 ohne Foreground-Service.** Die Wiedergabe überlebte den Hintergrund-Wechsel über
  30 s, aber ohne Foreground-Service beendet Android den Prozess irgendwann. Für die
  Produktion braucht es einen `MediaSessionService`; die Berechtigungen
  (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`) stehen bereits
  im Manifest.
- **Das Plugin wird umgangen.** Der Produktionsweg heißt: `@nativescript-community/audio`
  ablösen und `stores/audio.ts` gegen die Plattform-API neu schreiben — das ist der
  ~600-LOC-Rewrite aus der Aufwandsschätzung, jetzt mit belegter Machbarkeit.

## Konsequenz für die Stack-Entscheidung

Das in §8 gesetzte Gate ist **auf Android bestanden**. Der stärkste verbliebene Grund für
einen Wechsel zu Expo — „authentifiziertes Hintergrund-Audio geht nur mit selbstgeschriebenen
Native-Modulen" — ist damit widerlegt. Die Empfehlung „bei NativeScript bleiben" steht.

Offen bleibt die iOS-Seite. Sie ändert die Empfehlung nicht, weil sie bei Expo ebenfalls
Arbeit wäre, aber sie gehört vor die Beta-Planung.

## Artefakte

- `apps/mobile/src/spike/audio-spike.ts` — die Tests, kommentiert
- `apps/mobile/scripts/spike-audio-server.mjs` — der 401-Server
- `apps/mobile/App_Resources/Android/src/main/res/xml/network_security_config.xml` —
  Cleartext nur für `10.0.2.2`/`localhost`, damit der Emulator den lokalen Testserver
  erreicht. Für die Produktion irrelevant, aber für jeden weiteren Geräte-Spike nützlich.
