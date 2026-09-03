# Sources

What the app reads, what the requirements want it to read, and where the second list
has no answer in the first.

This exists for one deliverable: "Entscheidung: wie/welche Inhalt von welchen Quellen
in der App", due end of September. It is a statement of the current position, not a
proposal. Every figure was measured against the live source on **2026-09-03** and the
command that produced it is a plain `GET`; where a figure disagrees with a code
comment, the code comment is older and this file is right.

## What the app reads today

### Articles, from correctiv.org

WordPress REST (`wp/v2/posts` by category id), with the RSS feed of the same category
as the fallback path. Ids and not slugs, because a slug is editable in wp-admin.
Configured in [`packages/app-core/src/data/feeds.config.ts`](packages/app-core/src/data/feeds.config.ts).

| Feed | Category | Posts | Newest post |
| --- | --- | --- | --- |
| Recherchen | none, the site-wide feed | every post | daily |
| Faktencheck | `faktencheck` (5) | 2,951 | 2026-08-31 |
| Klima | `klimawandel` (94) | 161 | 2026-08-31 |
| CORRECTIV.Schweiz | `schweiz` (2568) | 10 | 2026-08-30 |
| CORRECTIV.Lokal | `lokal` (1017) | 10 | **2025-05-28** |
| Salon5 | `salon5` (1241) | 7 | **2025-12-11** |
| CORRECTIV.Europe | **no such category** | — | — |

Three rows need an editorial answer rather than a code change:

- **`europe` does not exist.** `wp/v2/categories?slug=europe` returns an empty list.
  There are `europa` (177, 44 posts) and `europa-aktuelles` (1319, 43 posts). Whether
  either is CORRECTIV.Europe's output is not a question the API can answer. The app
  currently shows the project as a teaser and loads nothing.
- **`lokal` has not moved in fifteen months.** The project works; the category does
  not. The app presents it as a content source.
- **`salon5` as a category is nearly empty**, which is correct: Salon5 publishes audio.
  The audio is connected separately, below.

### Newsletter archive

`wp/v2/newspack_nl_cpt`, a public post type: **525 issues** with title, date, teaser,
link and full text. The app reads the newest twelve for Home's briefing and the
archive screen. An issue links out to correctiv.org rather than into the reader,
because `content.rendered` is the sent email, table layout and all.

### Search

`wp/v2/search` over correctiv.org, with the already-loaded feeds as an offline
fallback. This path has always sent a CORS header, so it works on the web target too.

### Audio

- **Podcasts**: CORRECTIV's own Castopod at `salon5.correctiv.net`, standard podcast
  RSS per show at `/@<handle>/feed.xml`, real MP3 enclosures. The instance carries
  **18 shows**; the app lists **7** of them (`pausenbrot`, `klima`, `salon5_erklart`,
  `politik`, `europa_was_geht`, `sport`, `pyjama_party`).
  The eleven it does not list are `aus_der_salon5_redaktion`, `coronatalk`,
  `europa_nimmt_audio_auf`, `sus`, `wahlzeit`, `whats_up_america`, and **five local
  shows**: `bottrop`, `chemnitz`, `dortmund`, `greifswald`, `hamburg`. Which of the
  eighteen belong in the app is an editorial question and is deliberately not answered
  in code.
- **Live radio**: Icecast at `icecast.correctiv.net`, three mounts, all live on the day
  of measurement: `salon5low` (64 kbit/s), `salon5` (128), `sacharow` (Radio Sakharov,
  128, and it had listeners). The app plays the 64 kbit/s mount and lists Sakharov as
  an outbound link only.

### Video

- **YouTube**, Atom feeds: `CORRECTIV im Gespräch` (playlist) is shown; the main
  channel feed is configured and **shown nowhere**; the FunFacts channel feed is
  legacy, since FunFacts moved to PeerTube.
- **PeerTube**, CORRECTIV's own instance `tube.funfacts.de`: **185 videos across 9
  channels**. The app reads **one** channel, `funfacts.de`. The other eight are
  `marc_uwe_kling`, `tommy_krappweis`, `lennart_funfacts`, `pia_kanal`,
  `daniels_kanal`, `robins_kanal`, `support`, `root_channel`.

## What the requirements want, with no source

Every item here is in the feature scope. None of them has anything to read.

| Wanted | Marked MVP | Status |
| --- | --- | --- |
| Daily podcasts | yes | "Was zählt" has run since 2026-06-22, weekday evenings. It is **not** on the Salon5 Castopod, so its feed URL is unknown. A "Morgen-Podcast" is named with the note "(in konzeption)". |
| Time-based modules: morning podcast, evening Spotlight + "Was zählt" | yes | The mechanism exists (`packages/app-core/src/lib/daypart.ts`); both MVP slots resolve to nothing because of the row above. |
| Vertical video | yes | No source named. CORRECTIV's PeerTube is running and the player exists. |
| All events | yes | Nothing in the repo and no source named. One sample event sits in the Backstage screen. |
| Local newsletter posts for subscribers | yes | The entitlement carries `localAreas` and no code reads it. The five local Castopod shows are one candidate, the local Spotlight newsletters another; the requirements themselves ask "differences between local Spotlights and Lokal Redaktion?" |
| Topic and series directory on the new taxonomy | yes | A directory exists on today's ordering. The new taxonomy is "tbd". |
| Sections by Ressort or Beat, weighted ordering | yes | "tbd, either Ressorts or Beats". |
| Audio versions of articles, summaries, quizzes | no | Named as the app's exclusive formats. None exists. correctiv.org announced a Spotlight podcast with an AI voice on 2025-06-30; whether it still runs, and whether it is the "Morgen-Podcast", is a question for the newsroom. |

## Sample data standing in for a source

These files are typed in the shape of the API that will replace them, so that
connecting the real one is a data-layer swap. They are listed because on screen they
are indistinguishable from live content.

| File | Stands in for |
| --- | --- |
| `data/callouts.ts` | beabee CrowdNewsroom callouts, in beabee's own `CalloutDto` schema |
| `data/claims.ts` | the Faktenforum GraphQL backend, in its response shape |
| `data/backstage.ts` | club content: early access, diaries, bonus audio, **events**. No API exists |
| `data/abriss-atlas.ts` | abriss-atlas.de, which has no public API |
| `data/quartalsbericht.ts` | the transparency report, built from real published figures |
| `data/search-samples.ts` | search hits for content not in the feeds. Real titles |
| `data/podcasts.ts` | offline seed only. **It invents a "CORRECTIV Podcast" series** that has no source |
| `data/spotlight.ts` | offline seed: four real issues from the end of August 2026 |
| `data/projects.ts` | the Entdecken directory, ordered per the concept |

## The questions this document exists to get answered

1. Ressorts or Beats, and in what order, for Home.
2. `europe`: `europa`, `europa-aktuelles`, both, or neither.
3. `lokal`: keep presenting a category whose newest post is from May 2025?
4. Which of the eighteen Castopod shows belong in the app, and whether the five local
   ones fill the local section.
5. Where the "Was zählt" feed lives.
6. Whether the "Morgen-Podcast" exists, or is the 2025 AI-voiced Spotlight podcast.
7. "Evening Spotlight": the newsletter, or the podcast that is "in konzeption"? The app
   currently treats Spotlight as a morning newsletter.
8. Which platform holds vertical video.
9. Where events come from.
10. Whether the unused YouTube main channel should be shown.
