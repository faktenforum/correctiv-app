/**
 * What the app reads, declared once so no page has to count it again.
 *
 * `SOURCES.md` is the prose version and stays the document of record: it carries
 * the argument, the editorial questions and the figures. This file carries the
 * part a machine can check, which is exactly the part that rots when a website
 * renders a hand-written table and nobody notices the code moved underneath it.
 *
 * The split is deliberate and is the honest one:
 *
 *   STATUS IS DERIVABLE. Whether a screen is fed by an endpoint or by a checked-in
 *   file is a fact about this repository, so `test/sources.test.ts` fails when a
 *   file appears in `packages/app-core/src/data/` with no entry here. The board
 *   cannot quietly disagree with the code.
 *
 *   MEASUREMENTS ARE NOT. Post counts and newest-post dates were taken by hand
 *   against the live sources on the date below. A browser cannot re-take them,
 *   because the RSS feeds send no CORS header, and a build has no business
 *   pretending otherwise. So every figure here carries that date and the site
 *   shows it, with no relative times and no freshness indicator.
 */

/** Whether a thing on screen is fed by a real source, by a file, or by nothing yet. */
export type Status = 'live' | 'sample' | 'no-source';

/** For a live source, whether it is actually delivering. */
export type Health = 'healthy' | 'stale' | 'broken';

export type Kind =
  | 'articles'
  | 'newsletter'
  | 'search'
  | 'audio'
  | 'video'
  | 'club'
  | 'community'
  | 'directory';

export interface SourceEntry {
  id: string;
  label: string;
  kind: Kind;
  status: Status;
  health?: Health;
  /** The endpoint, for a live source. */
  endpoint?: string;
  /** The module in the core, repository-relative. Checked by the test. */
  module?: string;
  /** For sample data, the API it is shaped like and waiting for. */
  standsIn?: string;
  /** Whether the requirements mark the missing thing as MVP. */
  mvp?: boolean;
  note: string;
  /** Numbers into `QUESTIONS` below, so a row shows what it is blocking. */
  questions?: number[];
}

/** The day every figure on this page was taken, by hand, against the live sources. */
export const MEASURED_ON = '2026-09-03';

export interface Feed {
  label: string;
  category: string;
  posts: string;
  newest: string;
  health: Health;
  note?: string;
}

/** The article feeds, configured in `packages/app-core/src/data/feeds.config.ts`. */
export const FEEDS: Feed[] = [
  {
    label: 'Recherchen',
    category: 'the site-wide feed, no category',
    posts: 'every post',
    newest: 'daily',
    health: 'healthy',
  },
  {
    label: 'Faktencheck',
    category: 'faktencheck (5)',
    posts: '2,951',
    newest: '2026-08-31',
    health: 'healthy',
  },
  {
    label: 'Klima',
    category: 'klimawandel (94)',
    posts: '161',
    newest: '2026-08-31',
    health: 'healthy',
  },
  {
    label: 'CORRECTIV.Schweiz',
    category: 'schweiz (2568)',
    posts: '10',
    newest: '2026-08-30',
    health: 'healthy',
  },
  {
    label: 'CORRECTIV.Lokal',
    category: 'lokal (1017)',
    posts: '10',
    newest: '2025-05-28',
    health: 'stale',
    note: 'Fifteen months. The project works; the category does not. The app presents it as a content source.',
  },
  {
    label: 'Salon5',
    category: 'salon5 (1241)',
    posts: '7',
    newest: '2025-12-11',
    health: 'stale',
    note: 'Correctly so. Salon5 publishes audio, which is connected separately.',
  },
  {
    label: 'CORRECTIV.Europe',
    category: 'no such category',
    posts: 'none',
    newest: 'none',
    health: 'broken',
    note: '`wp/v2/categories?slug=europe` returns an empty list. `europa` (177, 44 posts) and `europa-aktuelles` (1319, 43 posts) exist; whether either is this project’s output is not a question the API can answer. The app shows the project as a teaser and loads nothing.',
  },
];

/** Connected, and only partly used. Its own kind of finding. */
export const UNUSED: { label: string; used: number; available: number; note: string }[] = [
  {
    label: 'Castopod shows',
    used: 7,
    available: 18,
    note: 'The eleven unlisted include five local shows: Bottrop, Chemnitz, Dortmund, Greifswald, Hamburg.',
  },
  {
    label: 'PeerTube channels',
    used: 1,
    available: 9,
    note: '185 videos across nine channels on CORRECTIV’s own instance; the app reads `funfacts.de` only.',
  },
  {
    label: 'YouTube feeds',
    used: 1,
    available: 3,
    note: 'The main channel feed is configured and shown nowhere; one is legacy since FunFacts moved to PeerTube.',
  },
  {
    label: 'Icecast mounts',
    used: 1,
    available: 3,
    note: 'All three were live on the day of measurement. The app plays the 64 kbit/s mount; Radio Sakharov is an outbound link only.',
  },
];

export const SOURCES: SourceEntry[] = [
  {
    id: 'articles',
    label: 'Articles',
    kind: 'articles',
    status: 'live',
    health: 'healthy',
    endpoint: 'wp/v2/posts, by category id',
    module: 'packages/app-core/src/data/feeds.config.ts',
    note: 'WordPress REST, with the RSS feed of the same category as the fallback path. Ids and not slugs, because a slug is editable in wp-admin. Seven feeds, three of which need an editorial answer rather than a code change.',
    questions: [2, 3],
  },
  {
    id: 'newsletter',
    label: 'Newsletter archive',
    kind: 'newsletter',
    status: 'live',
    health: 'healthy',
    endpoint: 'wp/v2/newspack_nl_cpt',
    note: 'A public post type, 525 issues with title, date, teaser, link and full text. The app reads the newest twelve for Home’s briefing. An issue links out to correctiv.org rather than into the reader, because the stored content is the sent email, table layout and all.',
    questions: [7],
  },
  {
    id: 'search',
    label: 'Search',
    kind: 'search',
    status: 'live',
    health: 'healthy',
    endpoint: 'wp/v2/search',
    module: 'packages/app-core/src/services/search.service.ts',
    note: 'Over correctiv.org, with the already-loaded feeds as an offline fallback. This path has always sent a CORS header, so it works on the web target too.',
  },
  {
    id: 'podcasts',
    label: 'Podcasts',
    kind: 'audio',
    status: 'live',
    health: 'healthy',
    endpoint: 'salon5.correctiv.net, podcast RSS per show',
    module: 'packages/app-core/src/services/podcast.service.ts',
    note: 'CORRECTIV’s own Castopod, real MP3 enclosures. The instance carries 18 shows and the app lists 7. Which of the eighteen belong in the app is an editorial question and is deliberately not answered in code.',
    questions: [4],
  },
  {
    id: 'radio',
    label: 'Live radio',
    kind: 'audio',
    status: 'live',
    health: 'healthy',
    endpoint: 'icecast.correctiv.net, three mounts',
    module: 'packages/app-core/src/services/radio.service.ts',
    note: 'All three mounts were live on the day of measurement. The app plays the 64 kbit/s mount; Radio Sakharov had listeners and is an outbound link only.',
  },
  {
    id: 'youtube',
    label: 'Video, YouTube',
    kind: 'video',
    status: 'live',
    health: 'healthy',
    endpoint: 'YouTube Atom feeds',
    note: '"CORRECTIV im Gespräch" is shown. The main channel feed is configured and shown nowhere; the FunFacts feed is legacy, since FunFacts moved to PeerTube.',
    questions: [10],
  },
  {
    id: 'peertube',
    label: 'Video, PeerTube',
    kind: 'video',
    status: 'live',
    health: 'healthy',
    endpoint: 'tube.funfacts.de',
    module: 'packages/app-core/src/services/peertube.service.ts',
    note: 'CORRECTIV’s own instance: 185 videos across 9 channels. The app reads one, `funfacts.de`.',
    questions: [8],
  },

  {
    id: 'callouts',
    label: 'Callouts',
    kind: 'community',
    status: 'sample',
    module: 'packages/app-core/src/data/callouts.ts',
    standsIn: 'beabee CrowdNewsroom callouts, in beabee’s own CalloutDto schema',
    note: 'Typed in the shape of the API that will replace it, so connecting the real one is a data-layer swap.',
  },
  {
    id: 'claims',
    label: 'Claims',
    kind: 'community',
    status: 'sample',
    module: 'packages/app-core/src/data/claims.ts',
    standsIn: 'the Faktenforum GraphQL backend, in its response shape',
    note: 'Typed in the shape of the API that will replace it.',
  },
  {
    id: 'backstage',
    label: 'Backstage',
    kind: 'club',
    status: 'sample',
    module: 'packages/app-core/src/data/backstage.ts',
    standsIn: 'club content: early access, diaries, bonus audio, and events',
    note: 'No API exists. One sample event sits here, which is the whole of the app’s event support.',
    questions: [9],
  },
  {
    id: 'abriss-atlas',
    label: 'Abriss-Atlas',
    kind: 'community',
    status: 'sample',
    module: 'packages/app-core/src/data/abriss-atlas.ts',
    standsIn: 'abriss-atlas.de',
    note: 'The site has no public API.',
  },
  {
    id: 'quartalsbericht',
    label: 'Transparency report',
    kind: 'club',
    status: 'sample',
    module: 'packages/app-core/src/data/quartalsbericht.ts',
    standsIn: 'the transparency report',
    note: 'Built from real published figures.',
  },
  {
    id: 'search-samples',
    label: 'Search samples',
    kind: 'search',
    status: 'sample',
    module: 'packages/app-core/src/data/search-samples.ts',
    standsIn: 'search hits for content not in the feeds',
    note: 'Real titles.',
  },
  {
    id: 'podcast-seed',
    label: 'Podcast seed',
    kind: 'audio',
    status: 'sample',
    module: 'packages/app-core/src/data/podcasts.ts',
    standsIn: 'an offline seed only',
    note: 'It invents a "CORRECTIV Podcast" series that has no source, which is the one place a sample is not merely standing in for something real.',
  },
  {
    id: 'spotlight-seed',
    label: 'Spotlight seed',
    kind: 'newsletter',
    status: 'sample',
    module: 'packages/app-core/src/data/spotlight.ts',
    standsIn: 'an offline seed',
    note: 'Four real issues from the end of August 2026.',
  },
  {
    id: 'projects',
    label: 'The Entdecken directory',
    kind: 'directory',
    status: 'sample',
    module: 'packages/app-core/src/data/projects.ts',
    standsIn: 'the project directory',
    note: 'Ordered per the concept.',
    questions: [1],
  },

  {
    id: 'daily-podcast',
    label: 'Daily podcasts',
    kind: 'audio',
    status: 'no-source',
    mvp: true,
    note: '"Was zählt" has run since 2026-06-22 on weekday evenings. It is not on the Salon5 Castopod, so its feed URL is unknown. A "Morgen-Podcast" is named with the note "in konzeption".',
    questions: [5, 6],
  },
  {
    id: 'dayparts',
    label: 'Time-based modules',
    kind: 'audio',
    status: 'no-source',
    mvp: true,
    module: 'packages/app-core/src/lib/daypart.ts',
    note: 'The mechanism exists. Both MVP slots, the morning podcast and the evening Spotlight, resolve to nothing because of the row above.',
    questions: [6, 7],
  },
  {
    id: 'vertical-video',
    label: 'Vertical video',
    kind: 'video',
    status: 'no-source',
    mvp: true,
    note: 'No source named. CORRECTIV’s PeerTube is running and the player exists.',
    questions: [8],
  },
  {
    id: 'events',
    label: 'All events',
    kind: 'club',
    status: 'no-source',
    mvp: true,
    note: 'Nothing in the repository and no source named. One sample event sits in the Backstage screen.',
    questions: [9],
  },
  {
    id: 'local-newsletter',
    label: 'Local newsletter posts',
    kind: 'newsletter',
    status: 'no-source',
    mvp: true,
    note: 'The entitlement carries `localAreas` and the profile prints them; nothing selects content by them. The five local Castopod shows are one candidate, the local Spotlight newsletters another.',
    questions: [4],
  },
  {
    id: 'taxonomy',
    label: 'Topic and series directory, new taxonomy',
    kind: 'directory',
    status: 'no-source',
    mvp: true,
    note: 'A directory exists on today’s ordering. The new taxonomy is "tbd".',
    questions: [1],
  },
  {
    id: 'ressorts',
    label: 'Sections by Ressort or Beat',
    kind: 'directory',
    status: 'no-source',
    mvp: true,
    note: 'Weighted ordering, and "tbd, either Ressorts or Beats".',
    questions: [1],
  },
  {
    id: 'exclusive-formats',
    label: 'Audio versions, summaries, quizzes',
    kind: 'articles',
    status: 'no-source',
    mvp: false,
    note: 'Named as the app’s exclusive formats. None exists. correctiv.org announced a Spotlight podcast with an AI voice on 2025-06-30; whether it still runs is a question for the newsroom.',
    questions: [6],
  },
];

/** The questions this page exists to get answered. Rows point at them by number. */
export const QUESTIONS: string[] = [
  'Ressorts or Beats, and in what order, for Home.',
  '`europe`: `europa`, `europa-aktuelles`, both, or neither.',
  '`lokal`: keep presenting a category whose newest post is from May 2025?',
  'Which of the eighteen Castopod shows belong in the app, and whether the five local ones fill the local section.',
  'Where the "Was zählt" feed lives.',
  'Whether the "Morgen-Podcast" exists, or is the 2025 AI-voiced Spotlight podcast.',
  '"Evening Spotlight": the newsletter, or the podcast that is "in konzeption"? The app currently treats Spotlight as a morning newsletter.',
  'Which platform holds vertical video.',
  'Where events come from.',
  'Whether the unused YouTube main channel should be shown.',
];

/**
 * Files in `packages/app-core/src/data/` that are not content and need no entry.
 *
 * Kept short on purpose. Every addition here is a file the board stops watching,
 * so it should be obvious from the name why it is not a source.
 */
export const NOT_CONTENT = ['feeds.config.ts', 'interests.ts'];

export const COUNTS = {
  live: SOURCES.filter((s) => s.status === 'live').length,
  sample: SOURCES.filter((s) => s.status === 'sample').length,
  noSource: SOURCES.filter((s) => s.status === 'no-source').length,
  stale: FEEDS.filter((f) => f.health === 'stale').length,
  broken: FEEDS.filter((f) => f.health === 'broken').length,
  questions: QUESTIONS.length,
};
