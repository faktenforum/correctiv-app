import { RADIO_MOUNTS } from '../data/feeds.config';
import { fetchJson } from './http';

/**
 * What is on air, from Icecast's own status document.
 *
 * `TROUBLESHOOTING.md` says availability cannot be probed, because Icecast answers
 * a HEAD request with 400 and "availability means: try to play". That is true of
 * HEAD and only of HEAD. `status-json.xsl` is a plain GET, it is public, and it
 * answers with every mount on the server: bitrate, current listeners, the peak,
 * and the title currently playing.
 *
 * So the banner can say what is running instead of a fixed subtitle. Worth knowing
 * what that revealed on 2026-09-01: both Salon5 mounts were playing
 * „Salon5 Mitschnitt 2024 04 05, 17 Uhr 02“, a recording, while the app's banner
 * read „24/7 aus Bottrop“. The app was not wrong about the stream, only about what
 * was on it.
 *
 * Three mounts live on this server. `salon5low` (64 kbit/s) is the one the app
 * plays, `salon5` (128) sits unused beside it, and `sacharow` is Radio Sakharov,
 * a CORRECTIV exile-media project the app currently only deep-links to.
 */
const STATUS_URL = 'https://icecast.correctiv.net/status-json.xsl';

const TIMEOUT_MS = 6000;

export interface RadioStatus {
  /** The mount is on the server and has a source connected. */
  online: boolean;
  listeners: number;
  /** Highest listener count since the server started. */
  listenerPeak: number;
  bitrateKbps: number;
  /** What is playing, or null when the server reports no title. */
  nowPlaying: string | null;
  /** The station name the server broadcasts, e.g. „Salon5 low“. */
  stationName: string | null;
}

interface IcecastSource {
  listenurl?: string;
  bitrate?: number;
  listeners?: number;
  listener_peak?: number;
  server_name?: string;
  title?: string;
}

/** Icecast serialises a single mount as an object and several as an array. */
interface IcecastStatus {
  icestats?: { source?: IcecastSource | IcecastSource[] };
}

/**
 * Icecast joins artist and title with " - " and keeps the separator when one half
 * is empty, so the measured title arrived as " - Salon5 Mitschnitt …". A leading
 * dash in the UI would read as a typo.
 */
function cleanTitle(raw: string | undefined): string | null {
  const title = (raw ?? '')
    .replace(/^[\s\-–—]+/, '')
    .replace(/[\s\-–—]+$/, '')
    .trim();
  return title || null;
}

/** The mount's name, from `listenurl`, which is the only field carrying it. */
function mountOf(source: IcecastSource): string {
  const url = source.listenurl ?? '';
  return url.slice(url.lastIndexOf('/') + 1);
}

/**
 * The status of one mount. Throws on a network or parse failure, so a caller can
 * treat a resolved promise as an answer and a rejection as "we do not know" —
 * which is different from `online: false`, and both are different from "silent".
 */
export async function fetchRadioStatus(
  mount: string = RADIO_MOUNTS.low.name,
): Promise<RadioStatus> {
  const status = await fetchJson<IcecastStatus>(STATUS_URL, { timeoutMs: TIMEOUT_MS });
  const raw = status.icestats?.source;
  const sources = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const source = sources.find((s) => mountOf(s) === mount);

  if (!source) {
    return {
      online: false,
      listeners: 0,
      listenerPeak: 0,
      bitrateKbps: 0,
      nowPlaying: null,
      stationName: null,
    };
  }

  return {
    online: true,
    listeners: source.listeners ?? 0,
    listenerPeak: source.listener_peak ?? 0,
    bitrateKbps: source.bitrate ?? 0,
    nowPlaying: cleanTitle(source.title),
    stationName: source.server_name ?? null,
  };
}
