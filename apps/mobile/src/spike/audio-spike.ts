/**
 * AUDIO SPIKE — not production code.
 *
 * Answers the one question that decides whether the app can stay on NativeScript
 * (APP-STRATEGIE.md §8): can the audio stack do what the feature scope requires —
 * an AUTHENTICATED stream (the "separate Castopod behind secret auth that only the
 * app can talk to"), playing in the BACKGROUND, with LOCK-SCREEN controls, and
 * available OFFLINE — without writing native modules for two platforms?
 *
 * The plugin in use (`@nativescript-community/audio`) exposes no header option:
 * `AudioPlayerOptions` has audioFile/loop/autoPlay/metering/pitch/callbacks/
 * audioMixing, seek, the iOS session options, audioStreamType, dataSource — and nothing for
 * HTTP headers. That is the finding that made this spike necessary.
 *
 * The escape hatch is that NativeScript exposes the whole Android SDK to JS, and
 * `android.media.MediaPlayer.setDataSource(String, Map<String,String>)` takes
 * headers. So the tests below drive the platform API directly, no plugin.
 *
 * Every result is logged with the `SPIKE:` prefix so it can be pulled out of
 * logcat. Run against scripts/spike-audio-server.mjs, which returns 401 without
 * `Authorization: Bearer spike-token` — so T2 passing PROVES the header arrived;
 * it cannot succeed by accident.
 */
import { Utils } from '@nativescript/core';

const BASE = 'http://10.0.2.2:8099';
const URL_AUDIO = `${BASE}/audio.mp3`;
const TOKEN = 'spike-token';

function log(...parts: unknown[]): void {
  console.log('SPIKE:', ...parts);
}

function ctx(): android.content.Context {
  return Utils.android.getApplicationContext();
}

/** Keeps the player alive across the async tests and the HOME-key check. */
let player: android.media.MediaPlayer | null = null;
let session: android.media.session.MediaSession | null = null;

function prepareAsync(
  p: android.media.MediaPlayer,
  timeoutMs = 12_000,
): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      resolve({ ok, detail });
    };

    p.setOnPreparedListener(
      new android.media.MediaPlayer.OnPreparedListener({
        onPrepared: () => done(true, 'prepared'),
      }),
    );
    p.setOnErrorListener(
      new android.media.MediaPlayer.OnErrorListener({
        onError: (_mp: android.media.MediaPlayer, what: number, extra: number) => {
          done(false, `onError what=${what} extra=${extra}`);
          return true;
        },
      }),
    );

    setTimeout(() => done(false, `timeout after ${timeoutMs}ms`), timeoutMs);

    try {
      p.prepareAsync();
    } catch (err) {
      done(false, `prepareAsync threw: ${err}`);
    }
  });
}

/** T1 — without the header the server must refuse, so playback must FAIL. */
async function t1NoHeader(): Promise<boolean> {
  const p = new android.media.MediaPlayer();
  try {
    p.setDataSource(URL_AUDIO);
    const { ok, detail } = await prepareAsync(p);
    // Inverted: failing here is the PASS condition — it shows the server really
    // enforces auth, which is what makes T2 meaningful.
    log(`T1 no-header: ${ok ? 'FAIL (played without auth!)' : 'PASS (refused)'} — ${detail}`);
    return !ok;
  } catch (err) {
    log(`T1 no-header: PASS (refused) — threw ${err}`);
    return true;
  } finally {
    try {
      p.release();
    } catch {
      /* ignore */
    }
  }
}

/** T2 — the decisive one: same URL, Authorization header, must play. */
async function t2WithHeader(): Promise<boolean> {
  const p = new android.media.MediaPlayer();
  try {
    const headers = new java.util.HashMap<string, string>();
    headers.put('Authorization', `Bearer ${TOKEN}`);
    headers.put('X-Correctiv-App', 'spike');

    // Use the THREE-argument overload (Context, Uri, Map), not the two-argument
    // (String, Map) one. NativeScript's runtime overload resolution cannot tell
    // (String, Map) from (Context, Uri) and picks the latter, which aborts the
    // process at the JNI boundary:
    //   JNI DETECTED ERROR IN APPLICATION: bad arguments passed to
    //   void android.media.MediaPlayer.setDataSource(android.content.Context, android.net.Uri)
    // The three-arg form is unambiguous — and needs no cast, because the typings
    // model it correctly.
    p.setDataSource(ctx(), android.net.Uri.parse(URL_AUDIO), headers);
    p.setAudioAttributes(
      new android.media.AudioAttributes.Builder()
        .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
        .build(),
    );

    const { ok, detail } = await prepareAsync(p);
    if (!ok) {
      log(`T2 authenticated stream: FAIL — ${detail}`);
      p.release();
      return false;
    }

    p.start();
    await new Promise((r) => setTimeout(r, 1500));
    const playing = p.isPlaying();
    const pos = p.getCurrentPosition();
    const dur = p.getDuration();
    log(
      `T2 authenticated stream: ${playing && pos > 0 ? 'PASS' : 'FAIL'} — isPlaying=${playing} pos=${pos}ms duration=${dur}ms`,
    );
    player = p; // keep for T3/T4
    return playing && pos > 0;
  } catch (err) {
    log(`T2 authenticated stream: FAIL — threw ${err}`);
    try {
      p.release();
    } catch {
      /* ignore */
    }
    return false;
  }
}

/** T3 — a MediaSession is what the lock screen and Bluetooth controls bind to. */
function t3MediaSession(): boolean {
  try {
    const s = new android.media.session.MediaSession(ctx(), 'CorrectivSpikeSession');

    s.setFlags(
      android.media.session.MediaSession.FLAG_HANDLES_MEDIA_BUTTONS |
        android.media.session.MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS,
    );

    const metadata = new android.media.MediaMetadata.Builder()
      .putString(android.media.MediaMetadata.METADATA_KEY_TITLE, 'CORRECTIV Spike-Episode')
      .putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, 'Salon5')
      .putLong(android.media.MediaMetadata.METADATA_KEY_DURATION, player ? player.getDuration() : 0)
      .build();
    s.setMetadata(metadata);

    const state = new android.media.session.PlaybackState.Builder()
      .setActions(
        android.media.session.PlaybackState.ACTION_PLAY |
          android.media.session.PlaybackState.ACTION_PAUSE |
          android.media.session.PlaybackState.ACTION_SEEK_TO |
          android.media.session.PlaybackState.ACTION_SKIP_TO_NEXT |
          android.media.session.PlaybackState.ACTION_SKIP_TO_PREVIOUS,
      )
      .setState(
        android.media.session.PlaybackState.STATE_PLAYING,
        player ? player.getCurrentPosition() : 0,
        1,
      )
      .build();
    s.setPlaybackState(state);

    // MediaSession.Callback is an abstract Java class. NativeScript subclasses those
    // with `.extend({...})`, NOT by passing an object literal to the constructor —
    // that fails with "Cannot marshal JavaScript argument [object Object] at index 0
    // to Java type." The typings model neither form, hence the cast.
    const Extendable = android.media.session.MediaSession.Callback as unknown as {
      extend(impl: Record<string, () => void>): {
        new (): android.media.session.MediaSession.Callback;
      };
    };
    const CallbackImpl = Extendable.extend({
      onPlay: () => log('T3 callback: onPlay from a media button'),
      onPause: () => log('T3 callback: onPause from a media button'),
    });
    s.setCallback(new CallbackImpl());

    s.setActive(true);
    session = s;
    log(`T3 MediaSession: PASS — active=${s.isActive()} token=${s.getSessionToken()}`);
    return true;
  } catch (err) {
    log(`T3 MediaSession: FAIL — threw ${err}`);
    return false;
  }
}

/** T4 — download for offline playback, via the same DownloadManager the app already uses. */
function t4Download(): boolean {
  try {
    const dm = ctx().getSystemService(android.content.Context.DOWNLOAD_SERVICE) as
      | android.app.DownloadManager
      | undefined;
    if (!dm) {
      log('T4 download: FAIL — no DownloadManager service');
      return false;
    }
    const req = new android.app.DownloadManager.Request(android.net.Uri.parse(URL_AUDIO));
    // The decisive part: DownloadManager takes arbitrary request headers too.
    req.addRequestHeader('Authorization', `Bearer ${TOKEN}`);
    req.setAllowedOverMetered(false); // "WLAN only" from the scope
    req.setNotificationVisibility(
      android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED,
    );
    req.setDestinationInExternalFilesDir(
      ctx(),
      android.os.Environment.DIRECTORY_PODCASTS,
      'spike.mp3',
    );
    const id = dm.enqueue(req);
    log(`T4 download: PASS — enqueued id=${id} with Authorization header, metered=false`);
    return true;
  } catch (err) {
    log(`T4 download: FAIL — threw ${err}`);
    return false;
  }
}

/** Reports whether audio is still running — read after the app is sent to the background. */
export function spikeReportPlaybackState(tag: string): void {
  try {
    const playing = player?.isPlaying() ?? false;
    const pos = player?.getCurrentPosition() ?? -1;
    log(`${tag}: isPlaying=${playing} pos=${pos}ms sessionActive=${session?.isActive() ?? false}`);
  } catch (err) {
    log(`${tag}: threw ${err}`);
  }
}

export async function runAudioSpike(): Promise<void> {
  log('=== audio spike start ===');
  log(`target ${URL_AUDIO} (401 without Authorization)`);

  const t1 = await t1NoHeader();
  const t2 = await t2WithHeader();
  const t3 = t2 ? t3MediaSession() : false;
  const t4 = t4Download();

  log('=== results ===');
  log(`T1 server enforces auth ......... ${t1 ? 'PASS' : 'FAIL'}`);
  log(`T2 authenticated stream plays ... ${t2 ? 'PASS' : 'FAIL'}`);
  log(`T3 MediaSession (lock screen) ... ${t3 ? 'PASS' : 'FAIL'}`);
  log(`T4 authenticated download ....... ${t4 ? 'PASS' : 'FAIL'}`);
  log('=== audio spike end (T5 background survival is checked from adb) ===');

  // Heartbeat so the background check has something to read.
  setInterval(() => spikeReportPlaybackState('heartbeat'), 5000);
}
