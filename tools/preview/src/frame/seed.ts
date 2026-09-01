/**
 * Storage fixtures: what the app finds when it boots.
 *
 * The shell and the app share an origin, so `window.localStorage` here **is** the
 * app's storage. Writing it before the frame is pointed at a route is therefore
 * the whole mechanism — no handshake, no cooperation from the app, and it works
 * against the static export too, where the dev handle does not exist.
 *
 * This is the half of state control a dispatch cannot do: `onboardingDone` is
 * read by the root layout before the first render, and the feed cascade consults
 * the cache on its way up. Everything that can wait until after boot goes through
 * the handle instead (`frame/handle.ts`), because that speaks the core's
 * vocabulary rather than copying its storage layout.
 *
 * Two things about the layout, both load-bearing and both cheap to get wrong:
 * `persist()` writes back only the keys a slice declares, so anything invented
 * here is dropped on the app's first write; and a payload that is not valid JSON
 * is not ignored but **deleted**, and the slice starts empty.
 */

/** `packages/app-core/src/services/cache.service.ts` — djb2, kept identical. */
function fileKey(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const blobKey = (ns: string, key: string) => `blob:${ns}/${fileKey(key)}.json`;

/** Feeds that carry articles: `CONTENT_FEEDS`, i.e. everything but `europe`. */
const CONTENT_FEEDS = ['recherchen', 'faktencheck', 'klima', 'schweiz', 'lokal', 'salon5'];

const ONBOARDED = {
  onboardingDone: true,
  pushOptIn: false,
  textScale: 1,
  newsletter: { spotlight: false, spotlightCh: false, klima: false },
  theme: 'system',
};

export interface Fixture {
  id: string;
  label: string;
  /** What this is for, in one line. Shown next to the control. */
  hint: string;
  write(store: Storage): void;
}

const kv = (store: Storage, slice: string, value: unknown) =>
  store.setItem(`kv:store.${slice}`, JSON.stringify(value));

/** Everything the app owns, and nothing else. */
function clearApp(store: Storage): void {
  for (const key of Object.keys(store)) {
    if (key.startsWith('kv:store.') || key.startsWith('blob:')) store.removeItem(key);
  }
}

export const FIXTURES: Fixture[] = [
  {
    id: 'fresh',
    label: 'Fresh install',
    hint: 'Nothing stored. The app starts at onboarding.',
    write: () => {},
  },
  {
    id: 'onboarded',
    label: 'Onboarded',
    hint: 'The ordinary case: the app starts on Home.',
    write: (s) => kv(s, 'settings', ONBOARDED),
  },
  {
    id: 'member',
    label: 'Member',
    hint: "The demo's central lever, visible on nearly every screen.",
    write: (s) => {
      kv(s, 'settings', ONBOARDED);
      kv(s, 'membership', {
        isMember: true,
        name: 'Alex Beispiel',
        memberSince: '2026-03-04T09:12:00.000Z',
        amountEur: 10,
        interval: 'monatlich',
        paused: false,
      });
    },
  },
  {
    id: 'saved',
    label: 'Saved articles',
    hint: '/gespeichert is otherwise empty and shows only its empty state.',
    write: (s) => {
      kv(s, 'settings', ONBOARDED);
      kv(s, 'savedArticles', {
        items: [
          {
            url: 'https://correctiv.org/faktencheck/2026/07/29/roboter-greift-menschen-an-video-ist-inszeniert/',
            title: 'Roboter greift Menschen an: Video ist inszeniert',
            kicker: 'Faktencheck',
            rating: 'falsch',
            savedAt: '2026-08-30T10:00:00.000Z',
          },
          {
            url: 'https://correctiv.org/russland/2026/08/11/russisches-haus-ein-ende-fuer-propaganda-und-spionage/',
            title: 'Russisches Haus, ein Ende für Propaganda und Spionage?',
            kicker: null,
            rating: null,
            savedAt: '2026-08-29T08:00:00.000Z',
          },
        ],
      });
    },
  },
  {
    id: 'interests',
    label: 'Interests picked',
    hint: 'A personalised Home: extra feeds, and modules in a different order.',
    write: (s) => {
      kv(s, 'settings', ONBOARDED);
      kv(s, 'interests', { selected: ['klima', 'faktenchecks', 'jugend'] });
    },
  },
  {
    id: 'submitted',
    label: 'Callout answered',
    hint: 'The form then shows its thanks instead of its questions.',
    write: (s) => {
      kv(s, 'settings', ONBOARDED);
      kv(s, 'participation', {
        submissions: [
          {
            calloutSlug: 'zukunft-von-correctiv',
            answers: { themen: ['klima', 'lokal'], wunsch: 'Mehr Lokales.', kontakt: '' },
            submittedAt: '2026-08-31T12:00:00.000Z',
          },
        ],
      });
    },
  },
  {
    id: 'bundle',
    label: 'Bundled content only',
    hint: "Forces the bundle fallback, the feeds' 'offline' status.",
    write: (s) => {
      kv(s, 'settings', ONBOARDED);
      // A STALE and EMPTY entry, which is the only combination that reaches the
      // fallback: fresh-and-empty short-circuits to `ready` with nothing in it
      // (`[]` is truthy), and no entry at all would work too but leaves the
      // 8-second fetch timeout in the way on a host that can reach the network.
      const stale = JSON.stringify({ data: [], ts: Date.now() - 16 * 60 * 1000 });
      for (const key of CONTENT_FEEDS) s.setItem(blobKey('feeds', key), stale);
    },
  },
  {
    id: 'big-type',
    label: 'Largest text scale',
    hint: 'A++ (1.15), the setting the reader breaks under first.',
    write: (s) => kv(s, 'settings', { ...ONBOARDED, textScale: 1.15 }),
  },
];

/**
 * Wipes the app's storage and writes one fixture.
 *
 * Always a full wipe first, so a fixture describes a whole state rather than a
 * patch on whatever the last visit left behind. Seeding is a boot-time input,
 * not durable state: the app's own `persist()` overwrites these keys 250 ms after
 * anything changes.
 *
 * An id nothing answers to leaves the storage alone instead of wiping it. A link
 * naming a fixture that has since been renamed should open the app, not clear
 * whatever the person looking at it had set up.
 */
export function applyFixture(store: Storage, id: string): void {
  const chosen = FIXTURES.find((f) => f.id === id);
  if (!chosen) return;
  clearApp(store);
  chosen.write(store);
}
