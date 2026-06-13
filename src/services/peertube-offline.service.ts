// Offline download for PeerTube videos (Android) — promoted from the spike.
// Not yet wired into the UI; kept ready for the offline feature.
//
// FINDINGS that shaped this:
//  1) tube.funfacts.de uses HLS with SPLIT audio/video tracks (web_videos off).
//     The video rendition's fragmented MP4 is VIDEO-ONLY; audio is separate.
//     So offline = a local HLS bundle: video fmp4 + audio fmp4 + their media
//     playlists + a trimmed master.m3u8. The playlists reference the mp4 by
//     RELATIVE name and each rendition is ONE byte-ranged file, so keeping the
//     original filenames in one folder makes the local master resolve.
//  2) NativeScript's built-in Http.getFile buffers the WHOLE response in memory
//     (Async$Http.readResponseStream -> ByteArrayOutputStream) and OOM-crashes
//     on real (10–20 min) FunFacts episodes (~100+ MB). We therefore stream to
//     disk via Android DownloadManager — background, constant-memory, no ANR.
//     (iOS would need NSURLSession download tasks — out of scope for this spike.)

import { Utils, File, Folder } from '@nativescript/core';
import { fetchText } from './http';
import type { PeerTubeVideo, PeerTubeRendition } from './peertube.service';

export interface OfflineBundle {
  masterPath: string;
  folder: string;
  bytes: number;
}

function context(): android.content.Context {
  return Utils.android.getApplicationContext();
}

/** App-specific external files dir — no permission needed, large capacity. */
function offlineRootPath(): string {
  const dir = context().getExternalFilesDir(null as any);
  if (!dir) throw new Error('External files dir unavailable.');
  return `${dir.getAbsolutePath()}/peertube-offline`;
}

function offlineDirPath(videoId: string): string {
  return `${offlineRootPath()}/${videoId}`;
}

export function localMasterPath(videoId: string): string {
  return `${offlineDirPath(videoId)}/master.m3u8`;
}

export function isDownloaded(videoId: string): boolean {
  return File.exists(localMasterPath(videoId));
}

export async function deleteOffline(videoId: string): Promise<void> {
  const p = offlineDirPath(videoId);
  if (Folder.exists(p)) await Folder.fromPath(p).remove();
}

function baseName(url: string): string {
  const clean = url.split('?')[0];
  return clean.substring(clean.lastIndexOf('/') + 1);
}

function pickVideoRendition(
  renditions: PeerTubeRendition[],
  resolutionId: number,
): PeerTubeRendition | undefined {
  const videos = renditions.filter((r) => r.hasVideo);
  return (
    videos.find((r) => r.resolutionId === resolutionId) ??
    videos.sort((a, b) => a.resolutionId - b.resolutionId)[0]
  );
}

function buildLocalMaster(
  video: PeerTubeRendition,
  videoPlaylist: string,
  audioPlaylist?: string,
): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:7'];
  if (audioPlaylist) {
    lines.push(
      `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="${audioPlaylist}"`,
    );
  }
  const audioAttr = audioPlaylist ? ',AUDIO="audio"' : '';
  const resolution = video.width && video.height ? `,RESOLUTION=${video.width}x${video.height}` : '';
  lines.push(
    `#EXT-X-STREAM-INF:BANDWIDTH=${Math.max(video.sizeBytes, 1)}${resolution},CODECS="avc1.640028,mp4a.40.2"${audioAttr}`,
    videoPlaylist,
  );
  return lines.join('\n') + '\n';
}

function downloadManager(): android.app.DownloadManager {
  return context().getSystemService(android.content.Context.DOWNLOAD_SERVICE) as android.app.DownloadManager;
}

/** Enqueue a streamed download into <externalFilesDir>/<relSubPath>; returns its id. */
function enqueue(url: string, relSubPath: string): number {
  const req = new android.app.DownloadManager.Request(android.net.Uri.parse(url));
  req.setDestinationInExternalFilesDir(context(), null as any, relSubPath);
  // NB: VISIBILITY_HIDDEN needs the DOWNLOAD_WITHOUT_NOTIFICATION permission and
  // throws SecurityException without it — keep the default visible notification.
  req.setAllowedOverMetered(true);
  req.setAllowedOverRoaming(true);
  return downloadManager().enqueue(req);
}

/** Poll DownloadManager until the given id succeeds or fails (max ~4 min). */
function awaitDownload(id: number): Promise<void> {
  const dm = downloadManager();
  const DM = android.app.DownloadManager;
  return new Promise((resolve, reject) => {
    let ticks = 0;
    const poll = () => {
      const query = new DM.Query();
      query.setFilterById([id]);
      const cursor = dm.query(query);
      try {
        if (cursor && cursor.moveToFirst()) {
          const status = cursor.getInt(cursor.getColumnIndex(DM.COLUMN_STATUS));
          if (status === DM.STATUS_SUCCESSFUL) return resolve();
          if (status === DM.STATUS_FAILED) {
            const reason = cursor.getInt(cursor.getColumnIndex(DM.COLUMN_REASON));
            return reject(new Error(`DownloadManager failed (reason ${reason})`));
          }
        }
      } finally {
        if (cursor) cursor.close();
      }
      if (++ticks > 600) return reject(new Error('Download timed out.'));
      setTimeout(poll, 400);
    };
    poll();
  });
}

/**
 * Download ONE resolution as a self-contained local HLS bundle (streamed to
 * disk) and return the path to its master.m3u8.
 */
export async function downloadForOffline(
  video: PeerTubeVideo,
  resolutionId = 360,
): Promise<OfflineBundle> {
  if (!video.renditions?.length) {
    throw new Error('No renditions — call fetchVideoDetail() before downloading.');
  }
  const videoR = pickVideoRendition(video.renditions, resolutionId);
  if (!videoR) throw new Error('No video rendition available.');
  const audioR = video.renditions.find((r) => r.hasAudio && !r.hasVideo);

  const rel = `peertube-offline/${video.id}`;
  const dir = offlineDirPath(video.id);
  Folder.fromPath(dir); // ensure the folder exists for the playlist writes

  // 1) Stream the big media files to disk via DownloadManager (no OOM, no ANR).
  const vName = baseName(videoR.fileUrl);
  const vId = enqueue(videoR.fileUrl, `${rel}/${vName}`);
  let aId = -1;
  if (audioR) aId = enqueue(audioR.fileUrl, `${rel}/${baseName(audioR.fileUrl)}`);
  await awaitDownload(vId);
  if (aId >= 0) await awaitDownload(aId);

  // 2) The media playlists are tiny text — safe to fetch in memory and write.
  const vPlaylist = baseName(videoR.playlistUrl);
  await File.fromPath(`${dir}/${vPlaylist}`).writeText(await fetchText(videoR.playlistUrl));
  let aPlaylist: string | undefined;
  if (audioR) {
    aPlaylist = baseName(audioR.playlistUrl);
    await File.fromPath(`${dir}/${aPlaylist}`).writeText(await fetchText(audioR.playlistUrl));
  }

  // 3) A trimmed master.m3u8 referencing only the downloaded variant + audio.
  await File.fromPath(localMasterPath(video.id)).writeText(buildLocalMaster(videoR, vPlaylist, aPlaylist));

  return {
    masterPath: localMasterPath(video.id),
    folder: dir,
    bytes: videoR.sizeBytes + (audioR?.sizeBytes ?? 0),
  };
}
