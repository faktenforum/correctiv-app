# @correctiv/desktop — an experimental GTK4 host

**This is a feasibility demonstration. It is not a release target, it is not built by
CI, and nothing ships from it.** It exists to answer one question with evidence rather
than argument: can the CORRECTIV app grow a desktop target without the core moving?

It can. The core did not move. What follows is what runs, what does not, and what this
does not prove.

The host is [gjsify](https://github.com/gjsify/gjsify)'s React-Native-on-GTK4 layer
(`@gjsify/react-native`; the manifest pins `^0.47.0` and a working copy is what this is
developed against, see *Against a gjsify working copy*), which renders React Native's
view vocabulary onto GTK4 and Adwaita. [ADR 0012](../../adr/0012-a-list-virtualizer-for-the-unbounded-lists.md)
and [ADR 0013](../../adr/0013-native-tabs-and-a-web-tab-bar-of-its-own.md) already named
this host as a reason for two decisions; this is that host, built.

![Home](screens/home.png)

## What actually runs

| | |
| --- | --- |
| **Routes** | 26 route files (24 openable hrefs + 2 layouts). **24 of 24 rendered** when last swept — 2026-09-04, on macOS under the node host, which is also the first sweep of a non-Linux target. The three routes that used to loop on a deep link are among them; see [*The deep-link loop*](#the-deep-link-loop-fixed-upstream-and-now-measured). |
| **The vertical slice** | Start → Artikel → Reader, working, over WebKitGTK. |
| **Audio** | Working, on GStreamer. Position advances, live streams are detected, and the port's re-entrancy contract holds. |
| **Chrome** | Adwaita's own. `Stack` is an `Adw.NavigationView`, `Tabs` an `Adw.ViewStack` + `Adw.ViewSwitcher` — moving to an `Adw.ViewSwitcherBar` at the bottom when the window is too narrow to show it, which is the phone's tab bar on a Linux phone. Nothing restyles a header bar or a button. |
| **Colour** | The app's own tokens, both palettes, generated from `packages/design-tokens/theme.css`. The screenshots here are the dark one. |
| **Video** | PeerTube plays, over GStreamer into a `GdkPaintable`. The YouTube embed is still a notice, and macOS/Windows are — see below. |

### The reader

`buildReaderHtml` in the core produces a complete, self-contained document, and every
host's job is to display it. WebKitGTK displays it, so the article looks the way it does
on the phone — including the typefaces, because the reader embeds its own
base64-subsetted fonts and that mechanism works unchanged inside WebKit.

![Reader](screens/reader.png)

### Audio, measured rather than screenshotted

A screenshot of the player proves a screen rendered, not that audio decoded. `npm run
audio-probe` drives the backend directly and prints what arrived:

```
--- bundled mp3 ---            --- live radio ---
ticks:        9                ticks:        115
loaded:       true             loaded:       true
position:     0.00s -> 2.87s   position:     0.00s -> 5.45s
durationSec:  97.47            durationSec:  0.00
live:         false            live:         true

--- the port's re-entrancy contract ---
ticks emitted from inside a command: 0 (must be 0)
```

That last line is the one worth having. `AudioBackend` states that a command must never
call the status listener synchronously, because a backend that emitted from inside
`pause()` once killed the app with `RangeError: Maximum call stack size exceeded` a
minute into an episode ([ADR 0006](../../adr/0006-one-core-two-hosts.md)). The probe
asserts the property rather than trusting the implementation.

### The profil crash, fixed

Home did not render at all for one merge, and it took every route with it, because
the tab stack mounts all five tabs from `/`. `(tabs)/profil.tsx` rendered three
`<Typo onPress>` under "Ihr Impact"; the layer refuses `onPress` on a `Gtk.Label` —
correctly, a label emits no `clicked` — and the uncaught `PrimitiveError` ended the
tree before anything else ran, `CORRECTIV_DESKTOP_ROUTE` included.

It arrived with [ADR 0018](../../adr/0018-removing-the-guest.md): those rows were inside
`{membership.isMember && …}` and were reached by nobody, so removing the guest branch
made them unconditional. Measured on one profile against two bundles of the same host:
the tree from before the merge captured Home at 92 125 bytes, the tree after it threw
and captured 12 848.

The remedy is the one the refusal names — wrap the three rows in a `Pressable`, which
is what the rest of this app already does for a tappable line of text — done in the
phone's screen, so it is correct on both hosts. A clean run now captures Home again,
at 93 470 bytes, with no `PrimitiveError` in the log.

## What does not work

### Twelve seconds of frozen window, from one number in the layer

**Fixed in the gjsify working copy this host is developed against, and in no
published version** — a checkout that installs `@gjsify/*` from npm still freezes.

A cold start pinned one core for 12.7 s. The main loop serviced nothing in that
window, so every feed the app had already asked for hit its timeout while the loop
never ran: the `The operation was aborted` lines in the log are that, not a network
fault, and they print in the millisecond the burn ends. The window was mapped and
correct throughout, which is why this was only ever reported as "it hangs a bit at
the start".

Four answers that sounded better than the right one, each killed by a measurement:

* **not the network** — identical 13.5 s inside `unshare -rn`, with no network at all;
* **not the stylesheet** — `StyleSheet.flush()` instrumented: four flushes, **2 ms** in total;
* **not layout in general** — a resize on the settled window costs 2 to 33 ms;
* **not the size of the tree** — the door, before any session, burns 300 ms all in.

There is no `sysprof` here, so `eu-stack` sampled the main thread three times during
the burn. All three stood in `gather_aligned_item_requests`, under
`gtk_flow_box_measure`, under GTK's own `surface_layout_cb` — GTK's ordinary layout
pass, not JS measuring synchronously.

`@gjsify/react-native` maps `flex-wrap` to `Gtk.FlowBox` and pinned its
`max-children-per-line` to 65535, which is GTK's spelling of "as many as fit" and
was pinned for a good reason: the default of 7 wraps a chip row after seven chips.
But GTK measures THE CAP rather than the children, and quadratically. One
`Gtk.FlowBox` holding TWO children, per measure, on GTK 4.22.4:

| cap | 64 | 1024 | 8192 | 32768 | 65535 |
| --- | --- | --- | --- | --- | --- |
| ms per measure | 0.018 | 0.40 | 19.3 | 421.8 | **1517.9** |

`ArticleRow` puts `flex-wrap` on its meta line, so the feed builds one of these per
article. Five on Home, about 2.5 s each.

**The cap is wrong in the answer too**, which is worse than what it costs and was
found on the way out: at `column-spacing: 8` the natural width carries
`8 × (cap - 1)` px of gaps that do not exist — 524 867 px for content 683 px wide.
The layer's own note said the natural width was "unaffected by it, measured
identical for 12 children at 12, 1024 and 65535", and that holds ONLY at
`column-spacing: 0` — the one case that table cannot produce, since it routes every
`gap-*` into `column-spacing`.

The fix is `ChildPolicy`'s `perLineCap` in `@gjsify/gtk-host`: the host keeps the cap
equal to the child count on every insert and every remove. A line can never hold
more children than exist, so it forbids nothing 65535 allowed and costs nothing to
measure. Measured here after the change: **13 510 ms → 700 ms**, 24 of 24 routes,
and the chip row still wraps into three lines at 560 px.

**Nothing in this app changed**, and that is the part to keep. The markup was
ordinary React Native the whole time, every screenshot of it was right, and
`npm run check` was green for the entire life of the defect. A screenshot proves a
tree rendered; it says nothing about what the render cost.

### The deep-link loop, fixed upstream and now measured

Three tab routes — `/mediathek`, `/mitmachen`, `/profil` — used to enter an infinite
update loop when entered by URL: React error #185 with
`gtk_widget_set_child_visible: assertion 'GTK_IS_WIDGET (widget)' failed` about thirty
times a second, 432 occurrences in 15 seconds. It was TWO defects that looked like one,
and separating them took a control run:

* the **criticals** were libadwaita's, reached through `@gjsify/gtk-host`:
  `adw_view_stack`'s `stack_remove()` clears `visible_child` and leaves
  `last_visible_child` pointing at a page whose widget it has just dropped. The host's
  `keyed` reorder removes all children and re-adds them, walking into that once per
  page per render. `Gtk.Stack` does not have the bug.
* the **loop** was the tab router's, in `@gjsify/react-native`: the effect that selects
  the visible page had no dependency array and a guard that only terminated once the
  selection had taken, so a name the stack does not carry yet never settled.

Both landed upstream as gjsify #1484 and #1485 — **in 0.46, the version this app was
already pinning.** So they were collected without a bump, and had simply never been
re-measured. Swept 2026-09-04 on macOS under the node host: **24 of 24 openable routes
render without a refusal**, the three former offenders included — and 24 of 24 again on
Linux afterwards, which is the regression check for the reader's own header change in
the same batch.

Worth keeping as the lesson rather than the fix: "fixed upstream, this app picks it up
on the next bump" aged into a false statement the moment the fix shipped in a version
the lockfile already held. A claim about a dependency needs re-measuring, not
re-reading.

**PeerTube video plays on Linux**, and the entry is kept because the claim it replaces
was wrong in an instructive way. It read: ~~"`@gjsify/video` is GJS-only while ADR
0032's ship path puts macOS and Windows on Node + node-gi, so real video here would
work on one of the three desktop targets"~~. That is true of `@gjsify/video` and says
nothing about video, and the app had the counter-example in it the whole time — the
audio backend plays over GStreamer through the same `gi://Gst` a video pipeline needs.

MEASURED on GStreamer 1.28.6 against the real feed, `playbin3` + `gtk4paintablesink`
on a FunFacts master playlist:

```
Paintable: GstGtk4Paintable
Zustand: PLAYING
  t=1s  Position 0.18s / 1146s  Bild 640x360
  t=5s  Position 4.20s / 1146s  Bild 2560x1440
```

The position tracks the wall clock, and the intrinsic size climbing from 640x360 to
2560x1440 four seconds in is HLS picking a rendition — adaptive streaming happening
rather than merely not refused. `Gtk.MediaFile` is the shorter road that goes nowhere:
it has no `new_for_uri`, and given a `Gio.File` for an `https://` playlist it blocks
instead of failing, because the demuxer resolves its segments against a URI the file
abstraction has taken away.

**macOS and Windows still get the notice, and the reason has moved from the toolkit to
the payload.** Their runtime bundles ship no video plugins at all: MEASURED against the
published `@gjsify/gtk-runtime-win32-x64@0.48.0` (42 GStreamer files) and
`-darwin-arm64` (33), both carry `gstvideo`, which is the LIBRARY, and not one plugin
that decodes or displays — no `videoconvert`, no `libav`, no `hls`/`adaptivedemux`, no
`gtk4paintablesink`. The seed list they are built from is called `GST_AUDIO_PLUGINS`
and is honest about it. So the same code would run there the day the bundle carries
the plugins, and until then `createVideoPlayer` throws by name and the screen says so.

**The YouTube stage is still a notice**, which is the other video path and a different
technology: an embed that would in fact load inside WebKitGTK, in a page this host does
not build. `src/overrides/VideoFrame.tsx` carries that one.

**No control strip.** GTK's ready-made one is `Gtk.MediaControls`, which drives a
`Gtk.MediaStream`; a GStreamer pipeline hands out a `GdkPaintable`, and the two do not
meet without a `GtkMediaStream` of our own.

**The reader has its fade back**, as of `@gjsify/react-native` 0.48, and the entry is
kept because the route it took is the lesson. It was first "`Animated` is not
implemented" (tier P3: a subsystem rather than a component, and doing it badly is worse
than not doing it). 0.46 implemented the three names this app uses, and the entry
narrowed to a composition: the phone's overlay header is an `<Animated.View
className="absolute …">`, and an `Animated.View` child did not make its parent a
`Gtk.Overlay` the way a `View` child does. Both features worked alone and did not
compose — filed as gjsify #1451.

0.48 fixed it as a class rather than a case (#1537: a wrapper is transparent to the
facts a parent reads), and `Animated.View` renders through the `View` primitive, which
declares `overlayOnAbsoluteChild`. Measured here on 2026-09-05: the phone's header
markup renders with no `PrimitiveError` and the 160 ms fade is restored on Linux and
macOS. `src/app/artikel.tsx` is still a variant, for the Windows reason below and for
nothing else — see [ADR 0026](../../adr/0026-re-exported-screens-and-a-variant-where-the-host-refuses.md).

**A colour-scheme change needs a restart.** Adwaita's chrome follows the setting
immediately, but the app's own token colours are resolved when their CSS class is
minted, so switching mid-session would leave half the window in each scheme. The palette
is read once, at startup.

**Smaller, each named where it happens:** no mini player (the narrow layout now has a
bottom bar to pin it above, but the wide one does not, and a strip that appears with
the window width is worse than one that is honestly missing); no lock-screen metadata
(MPRIS is the desktop counterpart and is not built); and `Bleed` does not bleed,
because GTK does not clamp a negative margin — it measures with it.

**A horizontal rail still has too much vertical space, and that is the last piece of
a defect whose other three are fixed.** The covers on Mediathek were 99x31 px where the
phone shows them square; they are square now. What is left is a video rail that
reserves the height of a card twice as wide as the one it draws.

The three that are fixed, because each was a separate thing:

* **`aspectRatio` was dropped**, with a note saying it was "used once, on the video
  stage". `Thumbnail` frames every cover and every still with one, so it was on 97
  image widgets. It becomes a `Gtk.AspectFrame` now — MEASURED, that widget is a
  height-for-width REQUEST and not an alignment: `measure(VERTICAL, 116)` answers 116
  at ratio 1 and 65 at 16/9. The descriptor it needed is upstream.
* **A `Gtk.Picture` sizes its parent.** Its natural width is the paintable's: a
  1400x1400 cover reports 1400, `can-shrink` only moves the MINIMUM to zero, and a
  box, a viewport and an aspect frame all pass it straight up. One 116px tile asked
  for 1437 px and a rail of seven asked for 10 060. React Native does not work that
  way — `<Image style={{ width: '100%' }}>` contributes no intrinsic size — so the
  picture sits in the one container measured to report 0/0, a `Gtk.ScrolledWindow`
  with `propagate-natural-*: false`. It scrolls nothing: both policies are NEVER and
  the child is allocated the viewport exactly. ~~Both policies are EXTERNAL~~ was the
  first shape and cost the rail its scrolling: an EXTERNAL policy leaves the scroller
  able to pan, so every wrapper around every cover swallowed the scroll events the
  rail around them needed.
* **A horizontal scroller never asks its content for a height.** `Gtk.ScrolledWindow`
  measures at width -1 and nothing changes that, so a rail of tiles answered 34 px:
  the labels, and nothing for the images. Fixed upstream at the content's own MINIMUM
  width, which is what an overflowing row is allocated. ~~At the width the content is
  actually given, `hadjustment:page-size`, the only width signal a `Gtk.Widget`
  has~~ — that was the first shape and three quarters of it went, each part for a
  measurement (gjsify #1599). The viewport's width differs from the minimum only when
  the content FITS, and there a size request cannot help: a request only RAISES a
  height, and a wrapping card that fills the rail needs 36 px where GTK already
  reports 160. **So that rail is still too tall**, GTK has no property that caps a
  natural height, and the vector upstream asserts the hook changes nothing there
  rather than leaving a branch that looks like a fix.

**A letter-spaced mark is one pixel short of its own text, and only one lever moves
that pixel.** MEASURED on GTK 4.22.4: a wrapping `Gtk.Label` whose text contains a
space reports a natural width below what Pango needs to set it on one line, by about
the tracking itself — 0 at `letterSpacing: 0`, 1 px at 0.4, 1, 1.2 and 1.5, 2 px at 2,
3 px at 3. A mark sized to its own content is therefore allocated exactly one pixel
too little at every window size, and what it does then depends on how it runs out:

| the mark | what it did |
| --- | --- |
| the yellow Backstage band, wrapping | „LESEN" on a second line the parent had committed no height for, clipped |
| the rail's badge, `numberOfLines={1}` | ellipsized at its natural width: „FAKTENCHE…" |

Same missing pixel, two symptoms, and a single-word mark („RECHERCHE", „Live",
„Spotlight") has no break opportunity and was never affected — which is why it only
ever showed on the two-word ones.

**Padding cannot fix it**, measured: it raises the natural width and the text's own
budget by the same amount, so the shortfall survives (165 → 166 → 167, still short).
That is why the first attempt at this failed and was reverted. `width-request` is the
only lever that moves one and not the other, and GTK ties it to the MINIMUM width as
well — so the fix is scoped to `numberOfLines={1}` in
[`src/shims/react-native.tsx`](src/shims/react-native.tsx), where a floor at the
one-line width is not a side effect but the behaviour the phone already has:
`flexShrink` defaults to 0, so a one-line label is never squeezed below its content
there either. Upstream it is an `it.failing` vector in gjsify's `text-metrics.spec.ts`,
and when GTK reports the width Pango needs, both go at once.

**A card is pinned open by one unbreakable word, and the obvious fix was measured and
rejected.** The live-radio banner would not shrink with the window, because a stream
announced its track as `20260901_Gamescom_Laberpocast_Sophie_Amelie_final` — one token
with no break in it. MEASURED on GTK 4.22.4: a `Gtk.Label` wraps at WORD boundaries, so
its MINIMUM width is its longest word, and that minimum IS its contribution to the
layout. 394 px for that string, and the card could be no narrower.

`wrap-mode: word-char` takes the minimum to 13 px, and it is the wrong fix. Measured
across five cases:

| text | `numberOfLines` | `word` | `word-char` |
| --- | --- | --- | --- |
| that filename | 1 | 13 | 13 |
| that filename | 2 | 394 | **13** |
| `Bundesverfassungsgericht` | 2 | 187 | **15** |
| `Live` | 1 | 13 | 13 |
| `Live` | 2 | 29 | **14** |

At one line it changes nothing — `ellipsize` already collapses the minimum. At two it
fixes the filename AND lets a short label be squeezed until Pango breaks it inside the
word: the club badge rendered as „LIV-“. A two-line card title in a narrow column is
the ordinary case, so there is no threshold that separates the two.

AND THE REAL CAUSE IS THE SAME ONE AS THE RAIL BELOW. React Native's `flexShrink`
defaults to 0, so a box is never squeezed below its content and its line-breaker never
gets asked; Android's own breaker would in fact break that word. Lowering a GTK label's
minimum lets GTK do something React Native never has the chance to do. It is a
`flexShrink` question wearing a `wrap-mode` costume, and GTK has no property for the
real one. Withdrawn upstream (gjsify #1600) with the measurement rather than merged.

**What is left is the natural width.** GTK measures a widget's minimum height in the
other orientation AT ITS NATURAL WIDTH, and a card's natural width is its title on one
line — 400 px for a card that renders at 155. So the rail reserves the height a 400 px
16:9 image would need. The fix is for `width: 155` to CAP the natural width, and GTK
has no property for that: `width-request` is a minimum by its own definition, and the
only container measured to cap a natural size is a scrolled window, which is a widget
per element rather than a property. Named here rather than half-fixed: an earlier
attempt gave the content its natural width instead, which corrected every chip row and
made every fixed-width tile grow past the width it declared.

**A letter-spaced label that is given exactly its natural width wraps and is clipped**,
and the cause is GTK's rather than this app's. Four labels of seventy-six: the masthead
date, two overlines, one centred line of small print. Each is allocated its own natural
width — which is what a flex container gives a child that does not expand — and at that
width GTK lays it out on two lines while its parent measured the height for one.

GTK's natural width for a wrapping label is `ceil(logical width)`, and Pango's logical
extents exclude the spacing after the final glyph while its line-breaker counts it. So
the breaker needs `ceil(logical + spacing)` and is handed one or two pixels less.
Measured on GTK 4.22.4 over four strings and six spacings:

| letter-spacing | 0.0 | 0.2 | 0.5 | 1.0 | 1.5 | 2.0 |
| --- | --- | --- | --- | --- | --- | --- |
| natural width short by | 0 | 0 | 0–1 | 1 | 1–2 | 2 |

It reaches through CSS `letter-spacing` and through a Pango attribute alike, is
unchanged by all three `natural-wrap-mode` values, and is not helped by excluding the
final character — so there is nothing for this app or for the GTK layer to set. It is an
`it.failing` vector in `@gjsify/react-native` now, which retires itself the day GTK
fixes it. The letter-spaced labels here are `Overline` and the masthead, so the app-side
answer, if one is wanted before then, is a pixel of padding on those two components.

Found with `DumpTree`, and only after that call learned to answer it: the widget reports
`wrap: true`, `max-width-chars: -1`, `hexpand: false`, all correct, and the defect lives
entirely in the allocation-versus-request pair that nothing used to report. That readout
is [gjsify #1589](https://github.com/gjsify/gjsify/pull/1589).

**Four entries left this list, and they are the whole accessibility set.** `@gjsify/react-native`
0.48 answers `accessibilityLabel`, `accessibilityRole`, `accessibilityState`,
`accessibilityHint` and `accessible` on every primitive this app uses
([gjsify #1541](https://github.com/gjsify/gjsify/pull/1541)), so `shims/react-native.tsx`
passes all five through and applies none of them. `test/prop-gate.test.ts` went red on
the upgrade and named all four, which is what it is for.

It is a deletion that ADDS a capability. Two of the four were reimplementations; the
other two were losses. **40 `accessibilityRole` call sites reach GTK for the first
time** — 20 `link`, 17 `button`, one `radio`, one `adjustable`, all four mapped by the
layer. Measured on the running window: 18 widgets now carry `GTK_ACCESSIBLE_ROLE_LINK`
and 10 `BUTTON`, read back through `GetProperty(<path>, "accessible-role")`. Nothing in
GTK defaults a widget to `LINK`, so those eighteen are the prop arriving.

Three further entries left this list because they were already fixed and the list had
not been re-read. **A routed window shows ONE header bar**, since
[gjsify #1540](https://github.com/gjsify/gjsify/pull/1540) in 0.48 — the second and third
bars, each with a close button of its own, are gone, and the screenshots on this page
were re-shot for it. **The brand typefaces are in the chrome now** — see below; the faces ship in
the payload and are registered at startup. **A chip row wraps**, since
`@gjsify/react-native` 0.46 maps `flex-wrap` to a wrapping widget; the shim's own note
to remove its stripping branch had been acted on and this sentence had not.

## How to run it

Needs GTK4, libadwaita, WebKitGTK 6.0 and GStreamer (base + good). On Linux it also
needs `gjs`; on macOS and Windows it does not — see *Two hosts, one source* below.

```bash
npm install                                 # from the repo root
npm run build     -w @correctiv/desktop     # dist/app.gjs.mjs   (Linux)
npm run start     -w @correctiv/desktop
```

**The app opens on the door.** Since [ADR 0016](../../adr/0016-a-door-at-the-root-and-an-entitlement-not-an-amount.md)
the root layout renders `LoginGate` instead of the navigator while the session is not
admitted, on this host as on the phone. Sign-in is simulated: any address gets in, with
any password of four characters or more. What that means for the two aids below is that
**they are behind the door too** — no route is mounted until a session is admitted, so
`CORRECTIV_DESKTOP_ROUTE` cannot land, and the log says
`CORRECTIV_DESKTOP_ROUTE was never applied within 15000 ms` rather than pretending. The
route sweep reads that as a failure, on purpose: a run that never left the door has
nothing to say about the route it was asked for.

So sign in once. The session persists to
`$XDG_CONFIG_HOME/correctiv-desktop/settings.ini`, where every later run finds it.

Three development aids, all environment-gated and all no-ops otherwise:

```bash
# Start on a particular route. Needs an admitted session in the profile; see above.
CORRECTIV_DESKTOP_ROUTE=/spotlight npm run start -w @correctiv/desktop

# Capture the window to a PNG and exit. In-process, because GNOME 45+ refuses
# org.gnome.Shell.Screenshot to an unsandboxed caller and this session is Wayland.
npm run screenshot   -w @correctiv/desktop   # writes dist/screenshot.png

npm run audio-probe  -w @correctiv/desktop   # drives the audio port, prints the ticks
npm run route-sweep  -w @correctiv/desktop   # opens every route, reads the log

# The two that exist because a green call is not a green outcome.
npm run font-probe   -w @correctiv/desktop   # asks the FONT MAP what it ended up with
npm run gst-probe    -w @correctiv/desktop   # asks the GStreamer REGISTRY what shipped
```

The last two are the instruments this port needed most, and both exist for the same
reason: the thing that reports success is not the thing that answers the question.
`initFonts()` reports what `add_font_file()` returned, and Pango does not report a
missing family — so a face can register successfully and the app still wear Tahoma.
A GStreamer error string reports a symptom whose cause it names wrongly — the same
`Internal data stream error` means "no TLS backend" in gjsify's own notes and meant "no
mp3 decoder" here. Each probe asks the subsystem instead of the call.

### Driving it from outside

`GJSIFY_DEVTOOLS=1` exports `org.gjsify.Devtools` on the session bus, at
`/org/correctiv/AppDesktopExperimental/devtools` under the application's own name. It
is opt-in and a no-op without the variable, so a normal run is byte-unchanged.

```bash
GJSIFY_DEVTOOLS=1 npm run start -w @correctiv/desktop
```

Twenty-six methods, of which four answer questions this host could not answer before:
`DumpTree` (the widget tree with stable positional paths), `GetProperty`,
`Screenshot` (the window, **or one widget by path** — its PNG dimensions are that
widget's allocation, which is how the clipped header date was measured), and
`FindWidget`/`ActivateWidget`/`SendKey`, which click- and key-drive the running app.

Nothing here wires it. It arrives with `registerRootComponent`, because
`RunApplicationOptions` extends the shell's whole option set rather than forwarding a
list of fields — the option that a forwarding list dropped was this one, and gjsify
#1455 is that omission. Reading a `-w @correctiv/desktop` flag is the whole setup.

**What it does not answer.** A widget's SIZE REQUEST. `DumpTree` says a widget is
mapped and `GetProperty` says its properties are what the code set, and neither
distinguishes a label that was allocated the width it asked for from one that was
allocated less and is now clipped. Rasterising each widget and reading the PNG header
is the workaround, and it reports the allocation without the request, so it says *that*
a widget is the wrong size and never *whose* arithmetic made it so.

### Against a gjsify working copy

Every defect this host has left is in gjsify rather than here, so the loop that matters
is the one from a fix there to a screenshot here. `scripts/gjsify-link.mjs` makes it
minutes instead of a release:

```bash
npm run gjsify:link   -w @correctiv/desktop -- --repo ~/src/gjsify   # once
npm run gjsify:status -w @correctiv/desktop                          # what is linked
npm run gjsify:unlink -w @correctiv/desktop                          # published again
```

It replaces every `node_modules/@gjsify/*` the working copy has a package for — all
ninety, not the four this app names — with a symlink, stashing the published directory
so `--unlink` is a rename rather than a download. All of them, because a linked package
resolves its OWN imports through the working copy: linking four would leave a bundle
holding two release trains, and gjsify's release train promises compatibility inside a
release, not across one.

**Build the working copy first.** `@gjsify/*` publish `lib/`, which is gitignored, so a
fresh checkout has every package's source and none of its entry points. The script
refuses to link an unbuilt package and names it rather than producing a bundler error
about a module that is plainly there.

**A linked package needs its peer dependencies pinned**, and `gjsify.config.mjs` does it
— see `peerDedupePlugin`. `react` and `react-reconciler` are peer dependencies of
`@gjsify/react-native`, which under npm's hoisting means one copy and nothing to decide;
through a symlink the layer resolves them in the gjsify checkout, where a second React
is installed as a devDependency. Two Reacts in one bundle, and the message is
`TypeError: can't access property "useMemo", z.H is null` from inside a `Provider`,
which reads as a bug in the layer.

`build:gjs` and `build:node` print which gjsify produced the bundle, down to the
checkout's `git describe`:

```
gjsify: LINKED — 90 package(s) from a working copy, not npm.
  /home/…/gjsify
    v0.48.0 · detached · v0.48.0-4-g0899bcc9ac · feat(adwaita)!: a page is chosen…
```

That readout is the point rather than the link. A version number does not distinguish
two bundles built an hour apart from a moving checkout, and "fixed upstream, this app
picks it up on the next bump" is the sentence this README already records ageing into a
false one. A claim about a dependency needs the dependency named in the build log.

### Two hosts, one source

Linux runs the `--app gjs` bundle on the distribution's own GJS. macOS and Windows have
no system GJS at all, so there the same source is built `--app node` and runs on Node
with [`@gjsify/node-gi`](https://www.npmjs.com/package/@gjsify/node-gi) bridging `gi://`.
gjsify's own ADR 0024 makes the same split for packaging: on Linux a `Depends: gjs` is
honest, and bundling ~100 MiB of interpreter beside it would not be.

Nothing in `src/` is host-conditional — the bundler rewrites every `gi://` import into a
lazy `requireGi()` call, so the split lives entirely in how the bundle is produced:

```bash
npm run build:node -w @correctiv/desktop     # dist/app.node.mjs  (macOS, Windows)
npm run build:all  -w @correctiv/desktop     # both

npm run start:node -w @correctiv/desktop     # run the other bundle deliberately
npm run route-sweep -w @correctiv/desktop -- --host node
```

**Run the node host from Linux.** It is the only machine that can run both, so it is the
only place the macOS/Windows bundle gets exercised before it reaches those machines.

### The three targets, measured on each

Every cell below was measured on the machine it names, on 2026-09-04, against
`@gjsify/*` `^0.47.0`. Nothing here is inferred from another platform — the note this
table replaced said "a claim proven on one of them has never yet held on the others",
and that turned out to be the most reliable sentence in the file.

| | Linux (gjs) | macOS darwin-x64 (node) | Windows win32-x64 (node) |
|---|---|---|---|
| Window + chrome | ✓ | ✓ | ✓ |
| Routes | **24 of 24** | **24 of 24** | ✓ Home and the reader; not swept |
| **The reader** | ✓ WebKitGTK | ✓ **WKWebView shim** | ✓ **WebView2** |
| Brand typefaces | ✓ | ✓ **inside a `.app`**, never outside one | ✓ |
| Bundled episode | ✓ | ✓ | ✗ no mp3 decoder |
| Live radio | ✓ | ✗ two GObject copies | ✗ no mp3 decoder |
| Accessibility labels | ✓ | ✓ | ✓ |

**The reader works on all three, and the engine was never in the runtime bundle.** It
comes from a package of its own — `@gjsify/webkit-native` on macOS,
`@gjsify/webview2-native` on Windows — and this host had simply never declared either.
Both answer to `gi://WebKit`, so nothing in `src/` branches. Measured, on each:

    [desktop] WebView: loading 523925 bytes of HTML.
    [desktop] WebView: load finished

`decide-policy` exists on neither shim, and that costs nothing: the portable click
interceptor this app already wrote for its web target gates navigation instead, and it
was written before it was needed for exactly this reason.

**On Windows the web view cannot be overlaid, and that is by construction.** WebView2 is
a child window the OS composites on top of the application (gjsify ADR 0035 stage 1), so
it is not a node in GTK's scene graph and anything drawn over it lands underneath. The
backend says so itself, once, naming the arrangement it found:

> this view is the main child of a GtkOverlay, so anything overlaid on it will be drawn
> UNDER the web content instead of over it

That made the reader a dead end there — its only way back is the button in its own
floating header. So the header is now ORDERED rather than positioned: a strip above the
document where the view cannot be overlaid, floating over it where it can. See
[`src/platform/webview.ts`](src/platform/webview.ts), which carries the measurement and
the trigger that removes it (ADR 0035 stage 2 puts the view in the scene graph).

**Audio is the one that got worse the more it was measured**, and the two failures have
nothing to do with each other:

- **macOS** — `souphttpsrc` ships and works; what breaks is that the bundle's own
  `libgstsoup.dylib` reaches libsoup through `g_module_open` **by leaf name**, and on a
  host with Homebrew glib that resolves to Homebrew's copy, which brings Homebrew's
  GObject with it. Two type systems in one process, so `g_type_name()` returns GObject's
  internal qdata quark strings and the stream silently never loads. gjsify #1536.
- **Windows** — the runtime bundle ships **no mp3 decoder**: `mpg123`, `vorbis` and
  `flac` are all absent from the payload while the builder's own seed list names them,
  so `mpg123audiodec` is NULL. The bundled episode and the Icecast stream are both mp3,
  which is why nothing plays. `soup` and the TLS backend are both fine there — the
  `Internal data stream error` the stream reports is the string gjsify documents for a
  missing TLS backend, and it is not that. gjsify #1544; `npm run gst-probe` is the
  probe that separates them.

**Brand typefaces need a `.app` on macOS, and now that is measured rather than
inferred.** `pango_font_map_add_font_file()` is a vfunc the CoreText map does not
implement, so the faces come back `declined` and the intended path is declarative: a
`.app` carries `ATSApplicationFontsPath` and the OS activates the staged directory
before the process starts. Same binary, same five faces, asked the same way:

| | outside a `.app` | inside the `.app` |
|---|---:|---:|
| families on Pango's map | 187 | **189** |
| `Merriweather` / `Source Sans 3` | ABSENT | **present** |
| every cut resolved to | Helvetica | the requested family |
| what `initFonts()` reported | `declined 5` | `declined 5` |

The last row is why `npm run font-probe` exists: the registration result is IDENTICAL in
the working case and the broken one, so nothing but the map can tell them apart. gjsify
had this open — its own ship output says the activation reaching CoreText is
"UNVERIFIED: no leg in this repository runs a `.app`" — and this is the confirmation,
reported back as gjsify #1354.

One precondition is easy to lose: the bundle's launcher must `exec` the node INSIDE
`Contents/MacOS/`, which it does once `@gjsify/node-runtime-darwin-x64` is installed. A
launcher reaching a `node` off `PATH` would run a process whose main bundle is Node's,
and `ATSApplicationFontsPath` would name nothing — same artifact, same `Info.plist`, no
fonts.

And one defect is measured and open upstream: a GTK app on `@gjsify/node-gi` dies
intermittently in the GI bridge (SIGSEGV or SIGABRT, roughly one run in three here),
which is a known nondeterministic lifetime bug in the bridge rather than anything this
app does. `npm run start:node` reports the signal by name rather than swallowing it.

## How it is put together

`ARCHITECTURE.md` puts the cost of a host at one file implementing four interfaces, and
[ADR 0007](../../adr/0007-removing-the-nativescript-host.md) says that estimate stopped
being theoretical when the NativeScript host was removed. It held here too.

```
src/platform/       the four ports        storage.ts (GKeyFile + Gio), content.ts
src/audio/          the fourth port       GStreamer playbin3, ticks on a 500 ms timer
src/generated/      tokens.generated.ts   from packages/design-tokens/theme.css
src/shims/          what gjsify does not answer yet — see below
src/overrides/      VideoFrame, the placeholder
src/app/            27 route files: 24 re-export the phone's screen, 3 are variants
```

**The route tree is re-exports, not forks.** Twenty-four of twenty-seven files are one
line. The three that differ — `_layout`, `(tabs)/_layout`, `artikel` — each carry a
header saying why, and `test/route-tree.test.ts` fails if the phone grows a screen this
host does not.

[ADR 0026](../../adr/0026-re-exported-screens-and-a-variant-where-the-host-refuses.md)
is the rule behind that, and the part worth reading before adding a fourth variant: a
file may differ for the ports, for a platform idiom an ADR already argues for, or for an
import the support table refuses — and **never for a refused prop**. A prop is answered
on the phone if the phone's own idiom answers it, and otherwise once in the shim below.
The profil crash is what that ordering is made of: the fix was a `Pressable` in the
phone's screen, not a desktop copy of a whole tab.

**The shims are the interesting part**, and every one is a real mapping or a named
refusal — never a silent no-op, because GTK's failure mode is exit 0 and a prop nobody
applied is indistinguishable from an application bug forever.

`src/shims/react-native.tsx` is the one that earns its place. The app passes props the
GTK layer refuses BY NAME in about 110 places, and every one of those refusals is
correct; this is where each gets one deliberate answer instead of 110 render-time
throws. `accessibilityLabel` and `accessibilityState` are **implemented** through
`Gtk.Accessible.update_property()`, which is what the refusal message points at. That
call is made on the WIDGET, and since 0.46 a ref does not always carry one — a
`TextInput` receives a `TextInputHandle` with the widget on `.widget`. `widgetOf()`
unwraps it. Without that the door's two fields, the only `TextInput`s in the app, lost
their screen-reader labels behind a warning that named the symptom and not the cause;
everything else on screen kept working, which is why nothing else caught it.
`hitSlop` is dropped, correctly — it is a concession to a fingertip on a platform whose
pointer is a mouse. It also flattens `style` arrays, translates six style properties GTK
spells differently, gives `justify-between` the spacer child its refusal asks for, and
gives a `Pressable` an inner box because a `Gtk.Button` takes one child and cannot be an
overlay.

**Two of its answers are the door's, and both are on their way upstream.**
`accessibilityLiveRegion` is dropped and is the honest loss: GTK4 has no live-region
property, its counterpart `Gtk.Accessible.announce()` is an imperative call needing the
moment and the text, and both uses are on the sign-in form — so a screen-reader user is
told nothing there about a failed sign-in. `@gjsify/react-native` is growing an answer
for it on `Text` through that same call, which is where it belongs. The other **has landed and the local
answer is gone.** React Native declares `TextInput` as a *class*, so the phone's
`useRef<TextInput>(null)` needs an instance type and its `focus()` needs a handle; the
shim declared both, with `focus` only, because a name this host could not honour would
turn a compile error into a silent no-op. The note said: when the layer grows the real
one, delete the local handle rather than extend it.

0.46 grew it. `TextInputHandle` answers all five members React Native documents,
refuses the four it cannot over GTK by name, and keeps the widget on `.widget`. Two of
its answers are better than the deleted code's: `blur()` checks that this widget
actually holds the focus before clearing the root's, and `isFocused()` reads
`is_focus()` rather than `has-focus`, which is false whenever the window is not the
compositor's active one. Neither distinction was in the local handle, and both are the
kind a port gets wrong.

Four shims the brief expected are **absent on purpose**: `expo-linking`,
`expo-web-browser`, `expo-constants` and `expo-system-ui` are declared in the app's
`package.json` and imported nowhere, so shimming them would be dead code pretending to
be coverage.

## Checks

`npm run check` at the repo root covers this workspace: the typecheck, the lint, and
five suites, thirty tests, in under a second. They are the guards a green build does not
give you.

- **`test/support-gate.test.ts`** reproduces the build-time support gate that
  `gjsify build --dialect react-native` would provide. This build does not use that flag
  (`gjsify.config.mjs` says why), so the gate is reproduced here against the same
  published support table — and it runs in a second, with no GTK, and reads the app's
  source, which is where the change will come from.
  **It gates imports, not props**, and that is the hole the profil crash went through:
  green here, green in the typecheck, green in the build, and then no tree at all. The
  named next step is `@gjsify/react-native/prop-table` — the layer's per-prop answers
  published as data with a generated `PROPS.md`, the way `support-table` already
  publishes the per-import ones. This test already reads the app's source; with that
  table beside it, a `<Typo onPress>` fails in a second instead of in a screenshot.
- **`test/route-tree.test.ts`** fails when the two trees drift, in either direction
  ([ADR 0026](../../adr/0026-re-exported-screens-and-a-variant-where-the-host-refuses.md)).
- **`test/root-layout.test.ts`** fails if this host stops rendering `LoginGate` instead
  of the navigator. It went ten commits with the navigator mounted unconditionally,
  because a missing door has no symptom on the machine of whoever is already admitted —
  which is every machine this host runs on. It checks the phone's file for the same
  construct, so the comparison cannot rot into passing against two files that both
  drifted.
- **`test/webview-gate.test.ts`** covers the reader's navigation gate, including the
  click interception that stands in where there is no `decide-policy` — which is macOS,
  Windows and the web target.
- **`test/tokens.test.ts`** regenerates and byte-compares, then restores the committed
  bytes — "drift is a failed PR, not a discovery"
  ([ADR 0010](../../adr/0010-design-tokens-as-a-shared-package.md)) — and asserts the two
  properties the generator exists to guarantee: whole-pixel spacing, and no token name
  reachable from two scales one family reads.

**What none of that proves is that anything looks right.** The same warning
[TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) opens with applies with more force here,
because this host's refusals happen at RENDER time, per screen: a green check, a green
typecheck and a successful build are all compatible with a screen that throws the moment
it is opened. `npm run route-sweep` is the answer to that — it opens all 25 routes and
reads the log — and it is how the three broken tab routes above were found.

## What this does not prove

- **Nobody has used it.** Every screen here was opened by a script and photographed. No
  one has clicked a tab, scrolled a feed with a mouse wheel, resized the window or
  tabbed through a form. The tab switcher in particular has never been *clicked*: the
  deep-link failure above is the only thing known about selecting a tab, and clicking one
  goes through a different path entirely.
- **Linux only.** ADR 0032 puts macOS and Windows on Node + `@gjsify/node-gi`, and the
  reader there would need `@gjsify/webkit-native` (macOS) or a backend that does not exist
  yet (Windows). Neither was attempted. The reader's WebKit shim is the file that would
  have to grow that seam.
- **No performance measurement of any kind**, on any screen.
- **The accessibility work is unverified.** Labels and states are applied through the
  right API; nobody has listened to Orca read a screen. Two things are known to be
  missing rather than unverified, and both are named in the shim: `accessibilityRole`,
  because GTK sets it at construction, and `accessibilityLiveRegion`, which is why the
  door announces nothing when a sign-in fails.
