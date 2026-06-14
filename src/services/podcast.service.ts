import type { PodcastSeries, PodcastEpisode } from '../data/podcasts';
import { PODCAST_HOST } from '../data/feeds.config';
import { fetchText } from './http';
import { parsePodcastFeed } from '../lib/rss-parse.mjs';
import { formatMinutesDe } from '../lib/format';

/**
 * Salon5 podcast data layer. Each show is a standard podcast RSS feed on
 * CORRECTIV's Castopod instance; episodes carry real MP3 enclosures that the
 * existing audio player streams directly. No auth.
 */
const PUBLISHER = 'Salon5';
const MAX_EPISODES = 20;
const MAX_DESCRIPTION = 240;

function feedUrl(handle: string): string {
  return `${PODCAST_HOST}/@${handle}/feed.xml`;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Fetch one Salon5 show as the app's PodcastSeries (newest episodes first). */
export async function fetchPodcastSeries(handle: string): Promise<PodcastSeries> {
  const feed = parsePodcastFeed(await fetchText(feedUrl(handle), 12000));
  const episodes: PodcastEpisode[] = feed.episodes.slice(0, MAX_EPISODES).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    durationLabel: formatMinutesDe(e.durationSec),
    audio: e.audioUrl,
  }));
  return {
    id: handle,
    title: feed.title || handle,
    publisher: PUBLISHER,
    description: clip(feed.description, MAX_DESCRIPTION),
    imageUrl: feed.imageUrl,
    episodes,
  };
}
