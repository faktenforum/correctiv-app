/**
 * Specimen data for the component gallery, and nothing else reads it.
 *
 * Real data wherever the core already ships some: `callouts`, `claims`,
 * `podcastSeries`, `projectGroups` and `searchSamples` are the same constants the
 * screens render, so a card in the gallery is the card the app draws. Only the two
 * models that arrive over the network — `FeedItem` and `Video` — are written out
 * here, because there is no offline constant for them that a component may import
 * (`__tests__/web-target.test.ts` keeps the bundled snapshots behind the platform
 * adapter, and this file is not it).
 *
 * The fixtures deliberately include the awkward cases: an item with no image, a
 * long headline, a missing reading time. A gallery of well-behaved data hides
 * exactly the layout faults it exists to show.
 */
import { callouts, type CalloutComponent } from '@correctiv/app-core/data/callouts';
import { claims, type Claim } from '@correctiv/app-core/data/claims';
import { podcastSeries } from '@correctiv/app-core/data/podcasts';
import { projectGroups } from '@correctiv/app-core/data/projects';
import { searchSamples } from '@correctiv/app-core/data/search-samples';
import type { FeedItem, Video } from '@correctiv/app-core/types/models';

/** A lead article, with everything a hero can show. */
export const ARTICLE: FeedItem = {
  id: 'gallery-article-1',
  feed: 'recherchen',
  title: 'Wem gehört die Stadt? Was die Grundbücher über Eigentum verraten',
  url: 'https://correctiv.org/aktuelles/2026/08/12/wem-gehoert-die-stadt/',
  teaser:
    'Zehntausende Wohnungen, wenige Eigentümer. Eine Recherche über Konzerne, Briefkastenfirmen und die Frage, wer eine Stadt eigentlich besitzt.',
  author: 'Alex Beispiel',
  publishedAt: '2026-08-12T07:30:00.000Z',
  categories: ['Recherchen', 'Lokal'],
  imageUrl: 'https://correctiv.org/wp-content/uploads/2026/08/stadt-1024x576.jpg',
  readingMinutes: 9,
};

/** The same model with the two optional fields missing, which is the common case. */
export const ARTICLE_BARE: FeedItem = {
  id: 'gallery-article-2',
  feed: 'klima',
  title: 'Ohne Bild und ohne Lesezeit, weil der RSS-Weg beides nicht kennt',
  url: 'https://correctiv.org/klima/2026/08/03/ohne-bild/',
  teaser: 'Der Fallback-Pfad liefert nur Titel, Teaser und Datum.',
  publishedAt: '2026-08-03T05:00:00.000Z',
  categories: ['Klima'],
  imageUrl: null,
};

/** Fact checks for the rail, one per verdict the design shows. */
export const FACTCHECKS: FeedItem[] = [
  {
    id: 'gallery-fc-1',
    feed: 'faktencheck',
    title: 'Roboter greift Menschen an: Video ist inszeniert',
    url: 'https://correctiv.org/faktencheck/2026/07/29/roboter-greift-menschen-an/',
    teaser: 'Die Aufnahme stammt aus einem Werbespot.',
    publishedAt: '2026-07-29T09:00:00.000Z',
    categories: ['Faktencheck'],
    imageUrl: null,
  },
  {
    id: 'gallery-fc-2',
    feed: 'faktencheck',
    title: 'Zahl der Windräder: Der Vergleich hinkt, die Zahl stimmt aber',
    url: 'https://correctiv.org/faktencheck/2026/07/21/windraeder/',
    teaser: 'Richtig gezählt, falsch verglichen.',
    publishedAt: '2026-07-21T11:15:00.000Z',
    categories: ['Faktencheck'],
    imageUrl: null,
  },
  {
    id: 'gallery-fc-3',
    feed: 'faktencheck',
    title: 'Ein sehr langer Titel, der über drei Zeilen läuft und deshalb hier steht',
    url: 'https://correctiv.org/faktencheck/2026/07/02/langer-titel/',
    teaser: 'Umbruchverhalten im Rail.',
    publishedAt: '2026-07-02T08:00:00.000Z',
    categories: ['Faktencheck'],
    imageUrl: null,
  },
];

export const VIDEO: Video = {
  id: 'gallery-video-1',
  title: 'FunFacts, Folge 12: Was kostet ein Windrad wirklich?',
  url: 'https://tube.funfacts.de/w/gallery-video-1',
  thumbnailUrl: 'https://tube.funfacts.de/lazy-static/previews/gallery-video-1.jpg',
  publishedAt: '2026-08-28T16:00:00.000Z',
  channel: 'funfacts',
  source: 'peertube',
  durationSec: 512,
  views: 4211,
};

export const PROJECT = projectGroups[0].projects[0];
export const SERIES = podcastSeries[0];
export const CROWDNEWSROOM = callouts.find((c) => c.kind === 'crowdnewsroom') ?? callouts[0];
export const SURVEY = callouts.find((c) => c.kind === 'survey') ?? callouts[0];

/** One hit per `SearchSample['kind']`, so every icon in the row is exercised. */
export const SAMPLE_HITS = (['podcast', 'callout', 'backstage', 'verlag', 'projekt'] as const)
  .map((kind) => searchSamples.find((s) => s.kind === kind))
  .filter((s): s is (typeof searchSamples)[number] => s !== undefined);

/**
 * One claim per status. The shipped data does not carry all three, so the missing
 * ones are the real claim with its status changed — the tag reads only `status`
 * and `rating`, so nothing else about the object matters to it.
 */
export const CLAIMS: Claim[] = (['submitted', 'checking', 'checked'] as const).map((status) =>
  // `Object.assign` onto a fresh object rather than a spread, which oxlint's
  // no-map-spread flags inside a `map`.
  Object.assign({}, claims[0], { id: `gallery-claim-${status}`, status } satisfies Partial<Claim>),
);

/** One field per component type the form schema allows. */
export const FORM_FIELDS: CalloutComponent[] = [
  {
    key: 'gallery-radio',
    type: 'radio',
    label: 'Wie oft lesen Sie CORRECTIV?',
    description: 'Eine Antwort.',
    required: true,
    values: [
      { label: 'Täglich', value: 'taeglich' },
      { label: 'Wöchentlich', value: 'woechentlich' },
      { label: 'Seltener', value: 'seltener' },
    ],
  },
  {
    key: 'gallery-selectboxes',
    type: 'selectboxes',
    label: 'Welche Themen interessieren Sie?',
    description: 'Mehrere Antworten möglich.',
    values: [
      { label: 'Klima', value: 'klima' },
      { label: 'Lokal', value: 'lokal' },
      { label: 'Faktenchecks', value: 'faktenchecks' },
    ],
  },
  {
    key: 'gallery-textfield',
    type: 'textfield',
    label: 'Ihre Stadt',
    placeholder: 'Bottrop',
  },
  {
    key: 'gallery-textarea',
    type: 'textarea',
    label: 'Was sollten wir recherchieren?',
    description: 'So genau, wie Sie möchten.',
    placeholder: 'Ihre Antwort …',
  },
  {
    key: 'gallery-file',
    type: 'file',
    label: 'Dokument anhängen',
    description: 'PDF oder Foto.',
  },
];

/**
 * A self-contained article document for `ReaderView`.
 *
 * The real one carries the token CSS and the embedded fonts and runs to hundreds
 * of kilobytes; this is short on purpose, because what the gallery shows about
 * this component is the frame around the document, not the document.
 */
export const READER_HTML = [
  '<!doctype html><html lang="de"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<style>body{margin:0;padding:16px;font:16px/1.5 -apple-system,sans-serif;',
  'background:var(--var-color-canvas,#fff);color:var(--var-color-on-canvas,#333)}',
  'h1{font-size:22px;line-height:1.2}a{color:var(--var-color-accent,#ff5064)}</style>',
  '</head><body><h1>Ein kurzes Dokument</h1>',
  '<p>Der Reader rendert ein vollständiges HTML-Dokument. Hier steht ein kurzes,',
  ' damit die Galerie den Rahmen zeigt und nicht den Text.</p>',
  '<p><a href="https://correctiv.org/">Ein Link</a>, den <code>onNavigate</code> abfängt.</p>',
  '</body></html>',
].join('');

/** A YouTube embed for `VideoFrame`, in the shape `app/video.tsx` builds. */
export const EMBED_URI = 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?playsinline=1&rel=0';
