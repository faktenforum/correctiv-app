# @correctiv/figma-plugin

The app's Figma plugin. It draws the app's screens onto a Figma board at 360x800 —
the logical size of the Android screenshots in [`screens/`](../../screens) — in two
renderings: a faithful **replica**, and a hand-drawn **wireframe**.

It is a **design tool, not a host**: nothing here ships, and the app does not depend
on it. The name is deliberately not "wireframes": a plugin is the only channel with
the full Plugin API, so whatever else this project needs done inside Figma belongs
here too.

## An interpreter, not a builder

`code.js` knows nothing about the app. It draws whatever `spec.json` describes.

    spec.json  ──  server.mjs  ──  ui.html  ──  code.js  ──  Figma
    the board      serves it      polls it     draws it

Changing the board therefore never means changing code, and never means re-importing
the plugin: edit `spec.json`, save, and it redraws within a second. Only a JSON
document crosses the wire, never anything executable.

    node tools/figma-plugin/server.mjs      # then run the plugin once, and leave it open

## Two renderings, one description

A page picks its `mode`. The description is identical; only the rendering differs.

| | `replica` | `wireframe` |
| --- | --- | --- |
| Type | Source Sans 3, Merriweather | Kalam, handwritten |
| Colour | the real tokens | a grey ramp; brand fills become outlines |
| Boxes | clean rectangles | drawn with a wobble, pencil-style |
| Copy | real | real |

**Nothing is overwritten.** `spec.json` carries the real tokens (`#ff5064`,
`#fde162`); the grey ramp is applied at draw time and only by a mode that has one.
A colour the ramp does not list is converted by its own luminance rather than
dropped, so the table stays a list of deliberate exceptions instead of something that
must be kept exhaustive.

The wobble is seeded from each node's name and size, so it is the *same* wobble on
every redraw. Without that the whole board shimmers on each save and a real change
becomes impossible to spot.

The copy stays real in both, because a wireframe full of lorem ipsum is one nobody
can argue with. What a wireframe drops is surface: colour, typeface, image content.

## The app's tokens, as Figma variables

`sync-tokens.mjs` reads `packages/design-tokens/theme.css` — the generated file the
app itself uses — and writes the values into `spec.json` under `tokens`. The plugin
turns those into a Figma variable collection called **CORRECTIV** and **binds** the
replica's fills to them, so changing a value in Figma repaints every screen that uses
it.

    node tools/figma-plugin/sync-tokens.mjs      # after npm run tokens

Run it whenever the tokens change, and the board follows the app. Figma is a place to
try a value out; it is never where a value is decided. The next sync overwrites
anything edited there, which is the intended direction of travel.

A colour in the spec written as `"@color-emphasis"` is bound; a literal `"#ff5064"`
is copied. The mapping from the board's palette to token names lives in `AS_TOKEN`
and is deliberately **not** exhaustive: the media-placeholder greys, the YouTube red
and the disabled tint stay literal, because giving them a token name would put a
label on a decision nobody made.

**Only the replica binds.** The wireframe exists in order not to be about colour, so
binding it too would mean a change to the emphasis token repainted a pencil drawing.

**A second variable mode is a paid Figma feature.** The tokens carry a light and a
dark value, but on a Starter plan `addMode` throws and the collection stays
light-only. The plugin catches that and says so in its summary rather than losing the
whole token set over it.

## The vocabulary

    t: 'frame'     dir V|H, pad, gap, fill, stroke, strokeSides, radius, w, h, align,
                   cross, clip, dash, children
    t: 'text'      chars, size, font sans|serif, weight, color, w, tracking, align,
                   style
    t: 'rect'      w, h, fill, stroke, radius
    t: 'ellipse'   w, h, fill, stroke
    t: 'space'     h
    t: 'line'      a hairline that fills its parent
    t: 'component' a frame instances can point at; props, and `bind` on a descendant
    t: 'variants'  prop, options[{ value, ... }] — one component set
    t: 'instance'  of, set { property: value }

`w`/`h` take a number, `'fill'` or `'hug'`. Any node may carry `x`/`y`, which Figma
honours inside a plain frame and ignores inside auto-layout — the API's own rule, so
there is nothing extra to remember.

A page entry takes `owned` — a list of frame names, or `'*'` for the whole page —
and the document takes `focus`, the page the file should open on. Without `focus`
that is whichever page was drawn last, and the kit has to be drawn first.

## The kit, from the app

`kit.mjs` writes the `Bausteine` page: one Figma component per component file in
`apps/mobile/src/components`, carrying the props its React counterpart carries.

    node tools/figma-plugin/kit.mjs

**It is built from the source, not cut out of the board.** An earlier version matched
component names against the drawn screens and lifted the first subtree that fitted.
That is the wrong direction, and it showed: the screens are transcribed from
screenshots, so what came back was a *usage* wearing a component's name. `ui/Card`
arrived carrying a heading, a paragraph and two buttons, none of which the thirteen
lines of `ui/Card.tsx` have ever known about.

| in the app | in Figma |
| --- | --- |
| `title: string` | a TEXT property |
| `club?: boolean` | a BOOLEAN property, driving one node's visibility |
| `variant: 'primary' \| …` | a variant set, one component per value |
| `<Badge>` inside `NavCard` | a nested instance, which follows `ui/Badge` |
| `<Typo variant="headline-l">` | a text style, not a component |

The last row is the one worth arguing about. A variant set for typography was the
first attempt and it is the wrong Figma object: `variant` is not something the app
instantiates, it is something the app *applies*, and a text style changes every text
node carrying it across every page — including nodes inside other components, which
a component can never reach. `<Typo variant weight>` is a pair, and Figma has no
partial style, so the four pairs the JSX actually writes (`text-m/bold` and three
more) become styles of their own. Which four is read off the source, not listed.

Colour is deliberately not part of a text style: the app picks a variant and a colour
token separately, so the style carries typography and a bound variable carries the
fill. Both in one would make every coloured headline its own style.

**What Figma cannot express is a slot.** An instance may override text and
visibility; it can never be given children. So `ui/Card` is the container it is in
the code, with a dashed placeholder where content goes, and a card that carries
content has to be its own component — in Figma *and* in the app. Seventeen places
still write `Overline` over a `Card` inline, which is why seventeen cards on the
board are copies rather than instances.

## Why a plugin and not the MCP server

Two other routes were tried first, and both have a ceiling this does not:

- **Figma's cloud MCP server** allows **20 tool calls per month** on a Starter plan.
  That budget builds about thirteen screens, then stops until the next month.
- **figma-linux-next's built-in MCP server** has no budget, but its write side is a
  fixed vocabulary: `create_frame`, `create_text`, `create_rectangle`, `update_node`,
  `delete_node`, `reparent_node`, `set_variable`. No vectors, so no pencil outlines
  and no arrowheads; no ellipses; no `layoutSizing* = FILL` on children; and
  `update_node` cannot change a font. It is also one HTTP round trip per node, and
  these screens run to hundreds of nodes each.

A plugin has the whole Plugin API and no quota. The read side of that same MCP server
is still the right way to *check* the result, and that is how these screens were
compared against `screens/android/`.

## Running it on Linux

Needs a desktop client, which on Linux means
[figma-linux-next](https://github.com/arximus88/figma-linux-next) (the official app is
macOS and Windows only).

    Plugins -> Development -> Import plugin from manifest -> manifest.json

**Importing stores a portal handle, and that handle holds one file.** The XDG document
portal grants access to exactly the file that was picked and mounts it under
`/run/user/<uid>/doc/<handle>`; figma-linux-next saves that as the plugin's path. A
plugin is always at least a manifest plus its main script, so the manifest loads and
then the console says `Unable to load code`. Fix it with the app closed:

    node tools/figma-plugin/fix-plugin-path.mjs [directory]

Re-run that after every re-import. `useZenity` in the app's settings does not help;
zenity is present inside the sandbox but the plugin importer does not use it.

Two further traps on the way there:

- **The sandbox cannot see this repo.** It is granted `xdg-documents` and
  `xdg-download` only. Either keep a copy under `~/Dokumente` (what
  `fix-plugin-path.mjs` defaults to) or grant this directory read access:
  `flatpak override --user --filesystem=$PWD:ro app.borys.FigmaLinuxNext`.
- **`~/Dokumente`, not `~/Documents`.** `xdg-documents` follows
  `XDG_DOCUMENTS_DIR`, which on a German system is the former. A plugin in the
  English-named directory is invisible to the sandbox.

Manifest note: a localhost origin belongs in `devAllowedDomains`, not
`allowedDomains`, and Figma wants `http://localhost:8787` rather than the bare IP.

## Two things to know

**Re-running is safe.** Every frame a page's `owned` list names is deleted before it
is rebuilt, so a redraw converges instead of stacking copies. Frames it does not own
are never touched. A fully generated page says `owned: '*'` and sweeps itself
instead: a name list only removes what the document still mentions, so a component
that gets renamed would otherwise stay behind for good.

**Arrows do not follow.** Figma design files have no Connector node, so navigation
would have to be drawn: vectors with `strokeCap: 'ARROW_LINES'` in one locked overlay.
Move a screen and its arrow stays behind. The navigation flow lives in a FigJam board
instead, where connectors are real.

## The typeface trap

Every `headline-*` variant in `packages/design-tokens/src/typography.generated.ts` is
`"family": "sans"`. **`text-article` is the only serif variant**, and `family="serif"`
is set explicitly in exactly one place, `apps/mobile/src/app/onboarding.tsx`.

An earlier version set every screen title in Merriweather, because two comments say so
and neither matches its own code: `components/feed/ArticleHero.tsx` opens with
"kicker, serif headline" and `components/feed/ArticleRow.tsx` with "serif title plus
meta", while both render `headline-l` / `headline-s`, which are sans. If you are about
to trust a comment about typography here, read the token instead.

## What is derived and what is transcribed

The screen list, the route names and the navigation edges come from
`apps/mobile/src/app/**`. The **content inside each screen is hand-transcribed** from
the screenshots in `screens/android/`, and that is the part that rots: change a
headline in the app and nothing here notices.

Six screens have no screenshot at all — `projekt/[id]`, `serie/[id]`,
`aufruf/[slug]`, `tagebuch/[id]`, `behauptung/[id]` and `formular`. Their layout is
inferred from the source, and they say so in their frame names, in the file, where
someone reading the board can see it.
