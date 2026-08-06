/**
 * Snapshots each curated Salon5 show (metadata + newest episodes) into
 * `src/assets/data/podcasts/`, which the `ContentBundle` port serves when a show
 * is unreachable. Episode audio stays a remote MP3 URL — only the list is
 * bundled.
 *
 *   npm run offline-podcasts -w @correctiv/mobile
 *
 * It calls the core's `fetchPodcastSeries`, the same function the app calls, so
 * the snapshot cannot drift from the live shape. It used to re-implement that
 * mapping here with a comment promising to keep the two in sync by hand.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import { fetchPodcastSeries } from '@correctiv/app-core/services/podcast.service';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const OUT = resolve(SRC, 'assets/data/podcasts');

mkdirSync(OUT, { recursive: true });

const index: { id: string; title: string; episodes: number }[] = [];

for (const handle of PODCAST_CHANNELS) {
  process.stdout.write(`Podcast ${handle} … `);
  try {
    const series = await fetchPodcastSeries(handle);
    writeFileSync(resolve(OUT, `${handle}.json`), JSON.stringify(series, null, 1));
    index.push({ id: handle, title: series.title, episodes: series.episodes.length });
    console.log(`✓ ${series.title} (${series.episodes.length} Episoden)`);
  } catch (err) {
    console.warn(`! ${handle}: ${(err as Error).message}`);
  }
}

writeFileSync(
  resolve(OUT, 'index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), podcasts: index }, null, 1),
);
console.log(`\nOffline podcast bundle: ${index.length} shows`);
