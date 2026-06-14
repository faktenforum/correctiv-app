# Spike: PeerTube native player + offline for the FunFacts videos

**Goal:** find out how well the FunFacts videos can be served from the project's
own PeerTube instance (`https://tube.funfacts.de`) with a **native player** and
**offline** support — and whether that beats the current YouTube‑in‑a‑WebView
approach. If native + offline works well it becomes the path; otherwise fall
back to the PeerTube **embed**.

Decision for the other two CORRECTIV channels ("im Gespräch", main channel):
**stay on YouTube for now** (hybrid). Only the FunFacts source moves.

---

## TL;DR — recommendation

| Capability | Verdict | Notes |
|---|---|---|
| **Native HLS streaming** | ✅ **GO** | Clear win. Drops the WebView + Google tracking, adds duration/views/subtitles, adaptive bitrate. Low risk. |
| **Data layer (REST instead of Atom)** | ✅ **GO** | Clean JSON, pagination, real search. Replaces the regex Atom parser for FunFacts. |
| **Offline audio** | ✅ **GO (easy)** | A single audio fragmented‑MP4 plays directly; the app already ships an audio player. |
| **Offline video (with sound)** | ✅ **Verified on Android** | Download both tracks via Android **DownloadManager** (NOT `Http.getFile` — it buffers the whole file in RAM and OOM‑crashes on real 10–20 min episodes), assemble a local HLS bundle, play `file://` — confirmed playing on the emulator with sound. iOS still needs the NSURLSession/`AVAssetDownloadTask` equivalent (see caveat). |

**Bottom line:** Move FunFacts to PeerTube and use the **native player for
streaming** now — verified end‑to‑end on an Android emulator (video + audio, no
WebView). **Offline video** also works on Android via DownloadManager; the only
remaining piece is the iOS offline‑download path. If that turns out too costly,
the PeerTube **embed** remains a solid fallback for playback while still using the
REST data layer.

---

## What was verified against the live instance

- PeerTube **8.2.0**, instance "Fun Facts". Public REST API, **no auth** needed
  (`/api/v1/...`). 120 videos, 9 channels (e.g. `funfacts.de` 1101 followers,
  `marc_uwe_kling` 678).
- Rich metadata in one JSON call: `name`, `description`, **`duration`**,
  **`views`**, `likes`, `category`, `channel` (+ avatars), `thumbnailPath`,
  `embedPath`, `publishedAt`, `language`, `licence`. The YouTube Atom feed gave
  us none of duration/views.
- Transcoding: **HLS enabled, `web_videos` (progressive MP4) disabled**,
  resolutions 360/480/720/1080(/1440/2160). `downloadEnabled: true`.
- HLS master playlist offers adaptive variants **plus German subtitles**
  (`#EXT-X-MEDIA:TYPE=SUBTITLES`).

### The key finding: split audio/video

This instance transcodes HLS with **separate audio and video tracks**:

- Each video rendition (`…-720-fragmented.mp4`, etc.) is **video‑only**
  (`hasAudio: false`).
- Audio is a separate rendition (`…-0-fragmented.mp4`, `hasAudio: true`).
- The `master.m3u8` references the video variant + an `AUDIO="audio"` group; an
  HLS player muxes them at playback time.
- The `/download/…-720-fragmented.mp4` endpoint is just a **302 redirect** to the
  raw video‑only file (same byte size, `3005398`) — it does **not** mux audio.

Implication: **streaming "just works"** (the player combines tracks), but a naive
single‑file offline download would have **no sound**. Each rendition is a single
byte‑ranged fragmented MP4 (`#EXT-X-MAP` + `#EXT-X-BYTERANGE` into one file), and
playlists reference files by **relative** name — so a correct offline download is
a small **local HLS bundle**: video mp4 + audio mp4 + their media playlists + a
trimmed `master.m3u8`.

---

## Plugin choice

**`@nstudio/nativescript-exoplayer`** (v6.2.0, updated Sep 2025). Its Android code
builds a real ExoPlayer `HlsMediaSource` with `setAllowChunklessPreparation(true)`
and auto‑detects `.m3u8` (or force `srcType="3"`); iOS uses `AVPlayer`, which
plays HLS natively. PeerTube is HTTPS, so no iOS ATS exception is needed.

Rejected: `@angelengineering/videoplayer` (Android `MediaPlayer`, unreliable for
fragmented‑MP4 HLS) and `@gavant/nativescript-exoplayer` (2019, dead).

Caveat: ExoPlayer 2.17.1 is the pre‑`androidx.media3` line — fine for a spike,
future migration target.

---

## What the spike contains

Isolated under `src/spike/peertube/` (does not touch the live YouTube path):

| File | Purpose |
|---|---|
| `peertube.service.ts` | Fetch FunFacts videos + detail from the PeerTube REST API; map to a `PeerTubeVideo` model (duration, views, HLS master, renditions). Also `embedUrl()` for the fallback. |
| `peertube-offline.service.ts` | Stream one resolution to disk via Android **DownloadManager** (video + audio fragmented‑MP4), write the media playlists + a trimmed `master.m3u8`, and expose `isDownloaded`/`localMasterPath`/`deleteOffline`. Uses DownloadManager — not `Http.getFile` — because the latter buffers the whole response in memory. |
| `register-player.ts` | `registerElement('ExoVideo', …)` — imported only by the spike page. |
| `PeerTubeSpikePage.vue` | UI: list → native HLS playback → "Offline laden" → local playback. |

`package.json` declares `@nstudio/nativescript-exoplayer` so `npm install` makes
the spike runnable. The spike is **not** wired into the default navigation, so the
main app still builds without the native plugin installed.

---

## How to run

```bash
# 1. Install the native player plugin
npm install @nstudio/nativescript-exoplayer

# 2. Add a temporary entry point in src/views/media/MediaPage.vue:
#      import PeerTubeSpikePage from '../../spike/peertube/PeerTubeSpikePage.vue';
#    and somewhere tappable:
#      <Label text="▶ PeerTube-Spike" class="ty-text-s px-sm pt-s" @tap="navigate(PeerTubeSpikePage)" />

# 3. Native rebuild is required (Gradle must pull ExoPlayer):
ns clean
npm run dev:android      # or: npm run dev:ios
```

What to look for:
- The list shows FunFacts videos **with duration + view counts**.
- Tapping a video plays the **HLS stream** natively (no WebView), with sound.
- "Offline laden (360p)" streams the video + audio tracks to disk, then plays the
  **local** bundle — verify **sound is present** (this is the split‑audio check).

---

## Results matrix

| | Android (ExoPlayer) | iOS (AVPlayer) |
|---|---|---|
| Data layer (REST list, duration/views) | ✅ verified on emulator | ✅ expected (plain HTTP/JSON) |
| HLS streaming (video + audio) | ✅ **verified on emulator** | ✅ expected (AVPlayer plays HLS natively) |
| Offline audio | ✅ works | ✅ works |
| Offline video + sound (local `file://` HLS) | ✅ **verified on emulator** | ⚠️ AVPlayer is unreliable with local HLS from `file://` |

## On‑device verification (Android emulator, API 36)

Built with `@nstudio/nativescript-exoplayer` and run on an `x86_64` emulator:

- **Data layer** — the spike page rendered the live FunFacts list from the REST
  API, each row showing **duration + view count** (e.g. "16:30 · 4691 Aufrufe").
- **Streaming** — tapping a video logged `ExoPlayerImpl: Init [ExoPlayerLib/2.17.1]`
  then a `c2.goldfish.h264.decoder` (video) **and** `c2.android.aac.decoder`
  (audio, 48 kHz stereo) + a live `AudioTrack`. The split audio/video master was
  muxed by the player; an actual video frame rendered on screen.
- **Offline** — "Offline laden" streamed both tracks to the app's external files
  dir via DownloadManager (`360-fragmented.mp4` ~45 MB + `0-fragmented.mp4` ~16 MB
  + the two `.m3u8` + a generated `master.m3u8`), then ExoPlayer re‑initialised on
  the local `file://…/master.m3u8` and decoded **video + audio** from disk
  (`Quelle: Offline`, "Spiele lokal"). Local playback with sound confirmed.

### Two engineering findings from the run

1. **Don't use `Http.getFile` for the download.** NativeScript's built‑in HTTP
   reads the whole response into a `ByteArrayOutputStream` first
   (`Async$Http.readResponseStream`), so a 16‑minute 720p file (~133 MB) throws
   `OutOfMemoryError`. Stream to disk via DownloadManager (Android) / NSURLSession
   (iOS) instead.
2. **DownloadManager visibility needs no hidden flag.** `VISIBILITY_HIDDEN`
   requires the `DOWNLOAD_WITHOUT_NOTIFICATION` permission and throws
   `SecurityException` without it — keep the default visible notification.

> Not yet verified on iOS hardware; the iOS offline‑download path is the one open
> item below.

### iOS offline caveat & options

AVPlayer historically does not play a local HLS `master.m3u8` from a `file://`
URL. Options for shippable offline video on iOS:

1. **Local HTTP server** (e.g. a tiny embedded server) serving the downloaded
   bundle over `http://127.0.0.1` — AVPlayer accepts that.
2. **`AVAssetDownloadTask`** — the official offline‑HLS API (stores a `.movpkg`).
   Needs a small native module; not exposed by the current plugin.
3. **Ship offline as audio‑only on iOS** initially (works today), video offline
   Android‑first.

---

## Recommendation & next steps

1. **Adopt PeerTube as the FunFacts data source** (REST) and the **native player
   for streaming** — this alone removes the YouTube/Google WebView and adds
   duration/views/subtitles. Lowest risk, biggest immediate win.
2. Promote the spike's `peertube.service.ts` into `src/services/`, add a
   `source: 'youtube' | 'peertube'` field to `feeds.config.ts`, and feed the
   existing `media` store. Keep the YouTube path for "im Gespräch" + main channel.
3. Extend the shared `Video` model with optional `durationSec`/`views` so
   `MediaCard` can show a duration badge.
4. **Offline:** Android offline video is proven (DownloadManager + local HLS
   bundle); ship offline **audio** everywhere first (cheap, reuses the audio
   player), and decide the iOS offline‑video path (local HTTP server vs
   `AVAssetDownloadTask`) before enabling offline video on iOS.
5. If the iOS native effort is not worth it now, use the PeerTube **embed**
   (`embedUrl()`, P2P disabled) as the playback layer — still a strict upgrade
   over YouTube‑nocookie, and keep the REST data layer regardless.
