/**
 * Generates the offline podcast bundle: a snapshot of each curated Salon5
 * Castopod show (metadata + newest episodes) as app assets. Run before a demo —
 * the demo must never depend on Wi-Fi. Episode audio stays a remote MP3 URL
 * (like article body images); only the list is bundled.
 *
 * Uses the same parser as the app (src/lib/rss-parse.mjs); the slim mapping
 * mirrors src/services/podcast.service.ts (kept in sync deliberately, like
 * fetch-offline-articles.mjs).
 *
 * Usage: npm run offline-podcasts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePodcastFeed } from '../src/lib/rss-parse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) CorrectivAppPrototype' };

const PODCAST_HOST = 'https://salon5.correctiv.net';
const PUBLISHER = 'Salon5';
const MAX_EPISODES = 20;
const MAX_DESCRIPTION = 240;

// Keep in sync with PODCAST_CHANNELS in src/data/feeds.config.ts
const CHANNELS = ['pausenbrot', 'klima', 'salon5_erklart', 'politik', 'europa_was_geht', 'sport', 'pyjama_party'];

const minutes = (sec) => `${Math.max(1, Math.round(sec / 60))} Min.`;
const clip = (t, max) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

async function fetchString(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

mkdirSync(resolve(SRC, 'assets/data/podcasts'), { recursive: true });

const index = [];
for (const handle of CHANNELS) {
  process.stdout.write(`Podcast ${handle} … `);
  try {
    const feed = parsePodcastFeed(await fetchString(`${PODCAST_HOST}/@${handle}/feed.xml`));
    const series = {
      id: handle,
      title: feed.title || handle,
      publisher: PUBLISHER,
      description: clip(feed.description, MAX_DESCRIPTION),
      imageUrl: feed.imageUrl,
      episodes: feed.episodes.slice(0, MAX_EPISODES).map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        durationLabel: minutes(e.durationSec),
        audio: e.audioUrl,
      })),
    };
    writeFileSync(resolve(SRC, `assets/data/podcasts/${handle}.json`), JSON.stringify(series, null, 1));
    index.push({ id: handle, title: series.title, episodes: series.episodes.length });
    console.log(`✓ ${series.title} (${series.episodes.length} Episoden)`);
  } catch (err) {
    console.warn(`! ${handle}: ${err.message}`);
  }
}

writeFileSync(
  resolve(SRC, 'assets/data/podcasts/index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), podcasts: index }, null, 1),
);
console.log(`\nOffline podcast bundle: ${index.length} shows`);
