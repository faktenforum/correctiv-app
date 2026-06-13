// PeerTube data layer for the FunFacts videos (tube.funfacts.de).
//
// FunFacts is served from CORRECTIV's own PeerTube instance instead of YouTube;
// the other video channels stay on YouTube (hybrid). Public read-only REST API,
// no auth. See SPIKE-PEERTUBE.md for the on-device verification of native HLS
// playback + offline.

import type { Video } from '../types/models';
import { fetchText } from './http';

/** Base URL of the FunFacts PeerTube instance. */
export const PEERTUBE_HOST = 'https://tube.funfacts.de';

/** The PeerTube video channel that hosts the FunFacts videos. */
export const FUNFACTS_CHANNEL = 'funfacts.de';

/** One streamable/downloadable rendition of a video. */
export interface PeerTubeRendition {
  resolutionLabel: string; // "720p" | "Audio only"
  resolutionId: number; // 720 | 0
  width: number;
  height: number;
  hasAudio: boolean;
  hasVideo: boolean;
  /** Single fragmented MP4 — both the HLS byte-range source AND a standalone file. */
  fileUrl: string;
  /** Per-resolution media playlist (m3u8) that byte-ranges into fileUrl. */
  playlistUrl: string;
  sizeBytes: number;
}

export interface PeerTubeVideo {
  /** shortUUID — used for embed + detail lookups. */
  id: string;
  uuid: string;
  title: string;
  description: string;
  /** seconds */
  durationSec: number;
  views: number;
  /** ISO-8601 */
  publishedAt: string;
  thumbnailUrl: string;
  channelName: string;
  channelDisplayName: string;
  /** Canonical watch URL on the instance. */
  url: string;
  /** HLS master playlist — adaptive, muxes the split audio + video + subtitles. */
  hlsMasterUrl?: string;
  /** Per-resolution single-file renditions (video-only) plus one audio-only track. */
  renditions?: PeerTubeRendition[];
}

interface ApiList<T> {
  total: number;
  data: T[];
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}

/** PeerTube returns absolute URLs for some fields, relative paths for others. */
function abs(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${PEERTUBE_HOST}${pathOrUrl}`;
}

function mapListVideo(v: any): PeerTubeVideo {
  const short = v.shortUUID ?? v.uuid;
  return {
    id: short,
    uuid: v.uuid,
    title: v.name,
    description: v.description ?? '',
    durationSec: v.duration ?? 0,
    views: v.views ?? 0,
    publishedAt: v.publishedAt,
    thumbnailUrl: abs(v.thumbnailPath),
    channelName: v.channel?.name ?? '',
    channelDisplayName: v.channel?.displayName ?? v.channel?.name ?? '',
    url: abs(`/w/${short}`),
  };
}

/** List the latest videos of a channel. The list payload has no streaming URLs. */
export async function fetchChannelVideos(
  channel = FUNFACTS_CHANNEL,
  count = 12,
): Promise<PeerTubeVideo[]> {
  const url = `${PEERTUBE_HOST}/api/v1/video-channels/${channel}/videos?count=${count}&sort=-publishedAt`;
  const res = await fetchJson<ApiList<any>>(url);
  return res.data.map(mapListVideo);
}

/** Fetch full detail incl. the HLS master playlist and per-resolution renditions. */
export async function fetchVideoDetail(idOrShort: string): Promise<PeerTubeVideo> {
  const v = await fetchJson<any>(`${PEERTUBE_HOST}/api/v1/videos/${idOrShort}`);
  const base = mapListVideo(v);
  const hls = (v.streamingPlaylists ?? [])[0];
  const renditions: PeerTubeRendition[] = (hls?.files ?? []).map((f: any) => ({
    resolutionLabel: f.resolution?.label ?? String(f.resolution?.id ?? ''),
    resolutionId: f.resolution?.id ?? 0,
    width: f.width ?? 0,
    height: f.height ?? 0,
    hasAudio: !!f.hasAudio,
    hasVideo: !!f.hasVideo,
    fileUrl: abs(f.fileUrl),
    playlistUrl: abs(f.playlistUrl),
    sizeBytes: f.size ?? 0,
  }));
  return { ...base, hlsMasterUrl: hls ? abs(hls.playlistUrl) : undefined, renditions };
}

/** Privacy-respecting embed URL (P2P disabled) — the no-native-player fallback. */
export function embedUrl(id: string): string {
  return `${PEERTUBE_HOST}/videos/embed/${id}?api=1&p2p=0&playsinline=1&title=0`;
}

/** Map a PeerTube video to the app's shared Video model. */
export function toVideo(pt: PeerTubeVideo): Video {
  return {
    id: pt.id,
    title: pt.title,
    url: pt.url,
    thumbnailUrl: pt.thumbnailUrl,
    publishedAt: pt.publishedAt,
    description: pt.description,
    durationSec: pt.durationSec,
    views: pt.views,
    source: 'peertube',
    hlsMasterUrl: pt.hlsMasterUrl,
  };
}

/** Fetch a PeerTube channel's latest videos as the app's shared Video[]. */
export async function fetchPeertubeChannelAsVideos(
  channel = FUNFACTS_CHANNEL,
  count = 12,
): Promise<Video[]> {
  const list = await fetchChannelVideos(channel, count);
  return list.map(toVideo);
}
