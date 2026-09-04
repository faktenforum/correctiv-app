/**
 * Three drawings, each standing in for a stretch of prose: where the behaviour
 * ends and the platform begins, which decisions still stand, and how the core is
 * layered inside.
 *
 * They are hand-authored inline SVG rather than images because a drawing whose
 * every fill and stroke comes from a class follows the light and dark schemes on
 * its own, with no second asset to keep in step. Each figure is followed by the
 * same content as a list: that list is not a caption, it is the page for anyone
 * who cannot use the drawing, and the diagram points at it with
 * `aria-describedby`, which is why the ids here have to stay as they are.
 */
export function Diagrams() {
  return (
    <main className="wrap" id="content">
      {/*
        The fragment ids a reader may arrive on sit on the sections themselves.
        The design carried them on an empty anchor before the heading, which is an
        anchor with neither content nor destination, and a section is the thing
        the link means anyway.
      */}
      <section id="core-host" aria-labelledby="h-core-host">
        <h2 id="h-core-host">1. The core and its host</h2>
        <p className="lede">
          All behaviour on one side, all platform on the other. The only crossing is four named
          ports, and the adapter that answers them is one small file.
        </p>
        <figure>
          {/*
            A named section, because that is what a landmark for a scrollable box
            is spelled as in HTML, and an `<svg>` with no role, because that
            element already carries the graphics-document role that a diagram
            wants. The name and the description come from the title inside it and
            the list below it, so the drawing is never the only way to read this.
          */}
          <section className="diagram d1" aria-label="Diagram 1, scrollable" tabIndex={0}>
            <svg viewBox="0 0 960 710" aria-labelledby="d1-title" aria-describedby="d1-alt">
              <title id="d1-title">
                The core and its host: packages/app-core above, apps/mobile below, joined only by
                four ports
              </title>
              <defs>
                <marker
                  id="d1-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M0 0 L10 5 L0 10 z" className="mk" />
                </marker>
              </defs>

              <rect x="40" y="28" width="880" height="190" rx="8" className="box box-core" />
              <text x="60" y="56" className="mono b t16">
                packages/app-core
              </text>
              <text x="900" y="56" textAnchor="end" className="muted t12">
                behaviour, all of it
              </text>
              <g className="mono t12">
                <rect x="60" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="108" y="98" textAnchor="middle">
                  model
                </text>
                <rect x="166" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="214" y="98" textAnchor="middle">
                  parsers
                </text>
                <rect x="272" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="320" y="98" textAnchor="middle">
                  services
                </text>
                <rect x="378" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="426" y="98" textAnchor="middle">
                  cache
                </text>
                <rect x="484" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="532" y="98" textAnchor="middle">
                  articles
                </text>
                <rect x="590" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="638" y="98" textAnchor="middle">
                  feeds
                </text>
                <rect x="696" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="744" y="98" textAnchor="middle">
                  audio
                </text>
                <rect x="802" y="84" width="96" height="28" rx="6" className="chip" />
                <text x="850" y="98" textAnchor="middle">
                  stores
                </text>
              </g>
              <text x="60" y="146" className="t13 b">
                Imports no UI framework and no platform SDK. That rule is what gives the package its
                value.
              </text>
              <text x="60" y="176" className="t12 muted">
                <tspan className="mono">packages/app-core/test/boundary.test.ts</tspan> fails the
                build if a platform import ever appears.
              </text>

              <line
                x1="150"
                y1="218"
                x2="150"
                y2="254"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="370"
                y1="218"
                x2="370"
                y2="254"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="590"
                y1="218"
                x2="590"
                y2="254"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="810"
                y1="218"
                x2="810"
                y2="254"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <text x="600" y="236" className="t11 muted">
                the core calls
              </text>

              <rect x="45" y="250" width="430" height="214" rx="10" className="dashed" />
              <text x="260" y="250" textAnchor="middle" className="t11 muted halo">
                storage ports
              </text>

              <g className="t12">
                <rect x="55" y="258" width="190" height="198" rx="8" className="card" />
                <text x="150" y="280" textAnchor="middle" className="mono b t13">
                  KeyValueStore
                </text>
                <line x1="55" y1="298" x2="245" y2="298" className="rule" />
                <text x="150" y="318" textAnchor="middle" className="t11 muted">
                  the core needs
                </text>
                <text x="150" y="338" textAnchor="middle">
                  small settings,
                </text>
                <text x="150" y="355" textAnchor="middle">
                  asynchronously
                </text>
                <text x="150" y="388" textAnchor="middle" className="t11 muted">
                  this host answers with
                </text>
                <text x="150" y="408" textAnchor="middle">
                  AsyncStorage, one prefixed
                </text>
                <text x="150" y="425" textAnchor="middle">
                  key per setting
                </text>

                <rect x="275" y="258" width="190" height="198" rx="8" className="card" />
                <text x="370" y="280" textAnchor="middle" className="mono b t13">
                  BlobStore
                </text>
                <line x1="275" y1="298" x2="465" y2="298" className="rule" />
                <text x="370" y="318" textAnchor="middle" className="t11 muted">
                  the core needs
                </text>
                <text x="370" y="338" textAnchor="middle">
                  the HTTP cache,
                </text>
                <text x="370" y="355" textAnchor="middle">
                  asynchronously
                </text>
                <text x="370" y="388" textAnchor="middle" className="t11 muted">
                  this host answers with
                </text>
                <text x="370" y="408" textAnchor="middle">
                  AsyncStorage
                </text>

                <rect x="495" y="258" width="190" height="198" rx="8" className="card" />
                <text x="590" y="280" textAnchor="middle" className="mono b t13">
                  ContentBundle
                </text>
                <line x1="495" y1="298" x2="685" y2="298" className="rule" />
                <text x="590" y="318" textAnchor="middle" className="t11 muted">
                  the core needs
                </text>
                <text x="590" y="338" textAnchor="middle">
                  what shipped inside the app
                </text>
                <text x="590" y="388" textAnchor="middle" className="t11 muted">
                  this host answers with
                </text>
                <text x="590" y="408" textAnchor="middle">
                  generated TS modules
                </text>

                <rect x="715" y="258" width="190" height="198" rx="8" className="card" />
                <text x="810" y="280" textAnchor="middle" className="mono b t13">
                  AudioBackend
                </text>
                <line x1="715" y1="298" x2="905" y2="298" className="rule" />
                <text x="810" y="318" textAnchor="middle" className="t11 muted">
                  the core needs
                </text>
                <text x="810" y="338" textAnchor="middle">
                  playback, as status ticks
                </text>
                <text x="810" y="388" textAnchor="middle" className="t11 muted">
                  this host answers with
                </text>
                <text x="810" y="408" textAnchor="middle">
                  expo-audio's status events
                </text>
              </g>

              <text x="260" y="476" textAnchor="middle" className="t11 muted">
                both asynchronous, split only
              </text>
              <text x="260" y="490" textAnchor="middle" className="t11 muted">
                by what they hold, a settings
              </text>
              <text x="260" y="504" textAnchor="middle" className="t11 muted">
                string against a megabyte of feeds
              </text>

              <line
                x1="150"
                y1="520"
                x2="150"
                y2="460"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="370"
                y1="520"
                x2="370"
                y2="460"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="590"
                y1="520"
                x2="590"
                y2="460"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <line
                x1="810"
                y1="520"
                x2="810"
                y2="460"
                className="wire"
                markerEnd="url(#d1-arrow)"
              />
              <text x="600" y="490" className="t11 muted">
                the host implements
              </text>

              <rect x="40" y="520" width="880" height="170" rx="8" className="box" />
              <rect x="41" y="521" width="878" height="34" rx="7" className="band" />
              <line x1="40" y1="556" x2="920" y2="556" className="rule-strong" />
              <text x="480" y="538" textAnchor="middle" className="t12">
                <tspan className="muted">adapter </tspan>
                <tspan className="mono b">apps/mobile/src/lib/platform/expo.ts</tspan>
                <tspan className="muted">
                  , one small file, and the whole cost of adding a host
                </tspan>
              </text>
              <text x="60" y="592" className="mono b t16">
                apps/mobile
              </text>
              <text x="900" y="592" textAnchor="end" className="muted t12">
                the host, all of the platform
              </text>
              <text x="60" y="622" className="t13">
                Expo / React Native
              </text>
              <text x="60" y="648" className="t13 muted">
                targets iOS, Android and web
              </text>
            </svg>
          </section>
          <figcaption>
            <strong>
              Everything that behaves lives above the ports; everything that touches a platform
              lives below them.
            </strong>{' '}
            The core declares the four interfaces and calls them, the host answers each one in{' '}
            <code>expo.ts</code>, and a test keeps the line from moving. Adding a second host means
            writing that one file again.
          </figcaption>
          <div className="alt" id="d1-alt">
            <h3>The same diagram as a list</h3>
            <dl>
              <dt>
                <code>packages/app-core</code>, the behaviour
              </dt>
              <dd>
                Contains model, parsers, services, cache, articles, feeds, audio and stores. It
                imports no UI framework and no platform SDK.{' '}
                <code>packages/app-core/test/boundary.test.ts</code> fails the build if a platform
                import ever appears.
              </dd>
              <dt>Four ports, the only crossing between the two</dt>
              <dd>
                <ul>
                  <li>
                    <code>KeyValueStore</code>: the core needs small settings, asynchronously. This
                    host answers with AsyncStorage, one prefixed key per setting.
                  </li>
                  <li>
                    <code>BlobStore</code>: the core needs the HTTP cache, asynchronously. This host
                    answers with AsyncStorage.
                  </li>
                  <li>
                    <code>ContentBundle</code>: the core needs what shipped inside the app. This
                    host answers with generated TS modules.
                  </li>
                  <li>
                    <code>AudioBackend</code>: the core needs playback, as status ticks. This host
                    answers with expo-audio's status events.
                  </li>
                </ul>
                Both storage ports are asynchronous. What separates them is what they hold, a
                settings string against a megabyte of cached feeds.
              </dd>
              <dt>The adapter</dt>
              <dd>
                <code>apps/mobile/src/lib/platform/expo.ts</code>, one small file. It is the whole
                cost of adding a host.
              </dd>
              <dt>
                <code>apps/mobile</code>, the host
              </dt>
              <dd>Expo / React Native, targeting iOS, Android and web.</dd>
            </dl>
          </div>
        </figure>
      </section>

      <section id="decisions" aria-labelledby="h-decisions">
        <h2 id="h-decisions">2. Which decisions still stand, and which of their claims do not</h2>
        <p className="lede">
          Twenty-three records, never rewritten. When a later decision makes an earlier claim false,
          the claim is struck through where it stands and the later record names what it retired.
          Read a row to see whether a record still holds; follow the arcs to see who amended it.
        </p>
        <figure>
          <section className="diagram d2" aria-label="Diagram 2, scrollable" tabIndex={0}>
            <svg viewBox="0 0 1100 985" aria-labelledby="d2-title" aria-describedby="d2-alt">
              <title id="d2-title">
                Architecture decision records 0001 to 0023 in order, with arcs from each later
                record to the earlier record whose claim it struck, and edges to the living
                documents it corrected
              </title>
              <defs>
                <marker
                  id="d2-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M0 0 L10 5 L0 10 z" className="mk" />
                </marker>
                <marker
                  id="d2-arrow-light"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M0 0 L10 5 L0 10 z" className="mk-light" />
                </marker>
                <pattern
                  id="d2-hatch"
                  patternUnits="userSpaceOnUse"
                  width="5"
                  height="5"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="5" className="hatch" />
                </pattern>
              </defs>

              <text x="330" y="40" textAnchor="end" className="t11 muted">
                a later record strikes a claim in an earlier one
              </text>
              <text x="360" y="40" className="t11 muted">
                record
              </text>
              <text x="412" y="40" className="t11 muted">
                title
              </text>
              <text x="700" y="40" className="t11 muted">
                claims struck by
              </text>

              <line x1="340" y1="70" x2="340" y2="818" className="axis" />

              <g className="arc-index">
                <path d="M330 274 C 210 274 210 104 330 104" markerEnd="url(#d2-arrow-light)" />
                <path d="M330 240 C 282 240 282 206 330 206" markerEnd="url(#d2-arrow-light)" />
                <path d="M330 274 C 264 274 264 206 330 206" markerEnd="url(#d2-arrow-light)" />
              </g>
              <text x="236" y="189" textAnchor="end" className="t11 muted halo">
                index: moot
              </text>
              <text x="290" y="223" textAnchor="end" className="t11 muted halo">
                index: amends
              </text>
              <text x="276" y="240" textAnchor="end" className="t11 muted halo">
                index: carries out
              </text>

              <g className="arc">
                <path d="M330 342 C 210 342 210 172 330 172" markerEnd="url(#d2-arrow)" />
                <path d="M330 342 C 246 342 246 240 330 240" markerEnd="url(#d2-arrow)" />
                <path d="M330 410 C 192 410 192 206 330 206" markerEnd="url(#d2-arrow)" />
                <path d="M330 410 C 228 410 228 274 330 274" markerEnd="url(#d2-arrow)" />
                <path d="M330 546 C 138 546 138 240 330 240" markerEnd="url(#d2-arrow)" />
                <path d="M330 546 C 156 546 156 274 330 274" markerEnd="url(#d2-arrow)" />
                <path d="M330 546 C 246 546 246 444 330 444" markerEnd="url(#d2-arrow)" />
                <path d="M330 648 C 48 648 48 172 330 172" markerEnd="url(#d2-arrow)" />
                <path d="M330 648 C 264 648 264 580 330 580" markerEnd="url(#d2-arrow)" />
                <path d="M330 682 C 246 682 246 580 330 580" markerEnd="url(#d2-arrow)" />
                <path d="M330 682 C 282 682 282 648 330 648" markerEnd="url(#d2-arrow)" />
                <path d="M330 716 C 156 716 156 444 330 444" markerEnd="url(#d2-arrow)" />
                <path d="M330 716 C 228 716 228 580 330 580" markerEnd="url(#d2-arrow)" />
                <path d="M330 716 C 264 716 264 648 330 648" markerEnd="url(#d2-arrow)" />
                <path d="M330 716 C 282 716 282 682 330 682" markerEnd="url(#d2-arrow)" />
                <path d="M330 784 C 84 784 84 376 330 376" markerEnd="url(#d2-arrow)" />
              </g>
              <g className="t11 halo">
                <text x="236" y="257" textAnchor="end">
                  2
                </text>
                <text x="263" y="291" textAnchor="end">
                  2
                </text>
                <text x="249" y="342" textAnchor="end">
                  2
                </text>
                <text x="182" y="393" textAnchor="end">
                  the CORS item
                </text>
                <text x="263" y="495" textAnchor="end">
                  1 row
                </text>
                <text x="276" y="614" textAnchor="end">
                  2
                </text>
                <text x="290" y="665" textAnchor="end">
                  2
                </text>
                <text x="290" y="699" textAnchor="end">
                  5
                </text>
                <text x="141" y="580" textAnchor="end">
                  2
                </text>
              </g>

              <g className="t13">
                <circle cx="340" cy="70" r="3.5" className="n-quiet" />
                <text x="360" y="70" className="mono t12 muted">
                  0001
                </text>

                <circle cx="340" cy="104" r="8" className="n-moot" />
                <text x="360" y="104" className="mono b muted">
                  0002
                </text>
                <text x="412" y="104" className="strike">
                  Stay on Vite 7
                </text>
                <text x="700" y="104" className="mono t12 muted">
                  moot since 0007, per the index
                </text>

                <circle cx="340" cy="138" r="3.5" className="n-quiet" />
                <text x="360" y="138" className="mono t12 muted">
                  0003
                </text>

                <circle cx="340" cy="172" r="8" className="n-struck" />
                <text x="360" y="172" className="mono b">
                  0004
                </text>
                <text x="412" y="172">
                  React Native pivot
                </text>
                <text x="700" y="172" className="mono t12 muted">
                  0009, 0018
                </text>

                <circle cx="340" cy="206" r="8" className="n-struck" />
                <text x="360" y="206" className="mono b">
                  0005
                </text>
                <text x="412" y="206">
                  Expo over NativeScript
                </text>
                <text x="700" y="206" className="mono t12 muted">
                  0011; index: 0006, 0007
                </text>

                <circle cx="340" cy="240" r="8" className="n-struck" />
                <text x="360" y="240" className="mono b">
                  0006
                </text>
                <text x="412" y="240">
                  One core, two hosts
                </text>
                <text x="700" y="240" className="mono t12 muted">
                  0009, 0015
                </text>

                <circle cx="340" cy="274" r="8" className="n-struck" />
                <text x="360" y="274" className="mono b">
                  0007
                </text>
                <text x="412" y="274">
                  Removing the NativeScript host
                </text>
                <text x="700" y="274" className="mono t12 muted">
                  0011, 0015
                </text>

                <circle cx="340" cy="308" r="3.5" className="n-quiet" />
                <text x="360" y="308" className="mono t12 muted">
                  0008
                </text>

                <circle cx="340" cy="342" r="8" className="n-intact" />
                <text x="360" y="342" className="mono b">
                  0009
                </text>
                <text x="412" y="342" className="muted">
                  Redux Toolkit for the core's state
                </text>

                <circle cx="340" cy="376" r="8" className="n-struck" />
                <text x="360" y="376" className="mono b">
                  0010
                </text>
                <text x="412" y="376">
                  Design tokens as a shared package
                </text>
                <text x="700" y="376" className="mono t12 muted">
                  0022
                </text>

                <circle cx="340" cy="410" r="8" className="n-intact" />
                <text x="360" y="410" className="mono b">
                  0011
                </text>
                <text x="412" y="410">
                  Naming the app for release
                </text>

                <circle cx="340" cy="444" r="8" className="n-struck" />
                <text x="360" y="444" className="mono b">
                  0012
                </text>
                <text x="412" y="444">
                  A list virtualizer
                </text>
                <text x="700" y="444" className="mono t12 muted">
                  0015, 0020
                </text>

                <circle cx="340" cy="478" r="3.5" className="n-quiet" />
                <text x="360" y="478" className="mono t12 muted">
                  0013
                </text>

                <circle cx="340" cy="512" r="8" className="n-intact" />
                <text x="360" y="512" className="mono b">
                  0014
                </text>
                <text x="412" y="512">
                  The preview shell as a package
                </text>

                <circle cx="340" cy="546" r="8" className="n-intact" />
                <text x="360" y="546" className="mono b">
                  0015
                </text>
                <text x="412" y="546">
                  Reading correctiv.org through its REST API
                </text>

                <circle cx="340" cy="580" r="8" className="n-struck" />
                <text x="360" y="580" className="mono b">
                  0016
                </text>
                <text x="412" y="580">
                  A door at the root
                </text>
                <text x="700" y="580" className="mono t12 muted">
                  0018, 0019, 0020
                </text>

                <circle cx="340" cy="614" r="3.5" className="n-quiet" />
                <text x="360" y="614" className="mono t12 muted">
                  0017
                </text>

                <circle cx="340" cy="648" r="8" className="n-struck" />
                <text x="360" y="648" className="mono b">
                  0018
                </text>
                <text x="412" y="648">
                  Removing the guest
                </text>
                <text x="700" y="648" className="mono t12 muted">
                  0019, 0020
                </text>

                <circle cx="340" cy="682" r="8" className="n-struck" />
                <text x="360" y="682" className="mono b">
                  0019
                </text>
                <text x="412" y="682">
                  Identity lives in the session
                </text>
                <text x="700" y="682" className="mono t12 muted">
                  0020
                </text>

                <circle cx="340" cy="716" r="8" className="n-intact" />
                <text x="360" y="716" className="mono b">
                  0020
                </text>
                <text x="412" y="716">
                  No contribution in the app
                </text>

                <circle cx="340" cy="750" r="3.5" className="n-quiet" />
                <text x="360" y="750" className="mono t12 muted">
                  0021
                </text>

                <circle cx="340" cy="784" r="8" className="n-intact" />
                <text x="360" y="784" className="mono b">
                  0022
                </text>
                <text x="412" y="784">
                  Three tiers of colour
                </text>

                <circle cx="340" cy="818" r="8" className="n-intact" />
                <text x="360" y="818" className="mono b">
                  0023
                </text>
                <text x="412" y="818">
                  The host constructs the store
                </text>
              </g>

              <rect x="888" y="470" width="204" height="352" rx="10" className="dashed" />
              <text x="990" y="470" textAnchor="middle" className="t11 muted halo">
                living documents
              </text>
              <text x="990" y="492" textAnchor="middle" className="t11 muted">
                rewritten in place, unlike a record
              </text>
              <rect x="900" y="514" width="180" height="30" rx="6" className="chip" />
              <text x="990" y="529" textAnchor="middle" className="mono t12">
                README.md
              </text>
              <rect x="900" y="604" width="180" height="30" rx="6" className="chip" />
              <text x="990" y="619" textAnchor="middle" className="mono t12">
                ARCHITECTURE.md
              </text>
              <text x="990" y="650" textAnchor="middle" className="t11 muted">
                0015 also: apps/, .github/, tests
              </text>
              <rect x="900" y="776" width="180" height="30" rx="6" className="chip" />
              <text x="990" y="791" textAnchor="middle" className="t12">
                code comments
              </text>

              <g className="arc-doc">
                <path d="M700 512 C 800 512 800 529 896 529" markerEnd="url(#d2-arrow)" />
                <path d="M700 546 C 800 546 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 784 C 800 784 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 818 C 800 818 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 818 C 800 818 800 791 896 791" markerEnd="url(#d2-arrow)" />
              </g>
              <g className="t11 halo">
                <text x="800" y="520" textAnchor="middle">
                  1
                </text>
                <text x="800" y="582" textAnchor="middle">
                  1 claim, in 18 places
                </text>
                <text x="800" y="701" textAnchor="middle">
                  2
                </text>
                <text x="800" y="722" textAnchor="middle">
                  1
                </text>
                <text x="800" y="806" textAnchor="middle">
                  4
                </text>
              </g>

              <line x1="40" y1="848" x2="1092" y2="848" className="rule" />
              <g className="t12">
                <circle cx="60" cy="872" r="8" className="n-intact" />
                <text x="76" y="872">
                  accepted, intact
                </text>
                <circle cx="260" cy="872" r="8" className="n-struck" />
                <text x="276" y="872">
                  accepted, some claims struck through in place
                </text>
                <circle cx="600" cy="872" r="8" className="n-moot" />
                <text x="616" y="872">
                  <tspan className="strike">moot</tspan>, superseded in substance
                </text>
                <line
                  x1="40"
                  y1="908"
                  x2="96"
                  y2="908"
                  className="arc"
                  markerEnd="url(#d2-arrow)"
                />
                <text x="108" y="908">
                  the later record names the claim it strikes, a number says how many
                </text>
                <line
                  x1="40"
                  y1="936"
                  x2="96"
                  y2="936"
                  className="arc-index"
                  markerEnd="url(#d2-arrow-light)"
                />
                <text x="108" y="936">
                  recorded only in the index, before 0009 no record named what it retired
                </text>
                <line
                  x1="40"
                  y1="964"
                  x2="96"
                  y2="964"
                  className="arc-doc"
                  markerEnd="url(#d2-arrow)"
                />
                <text x="108" y="964">
                  a claim struck in a living document, which is rewritten rather than annotated
                </text>
              </g>
            </svg>
          </section>
          <figcaption>
            <strong>A record is amended, never rewritten, so its history is a set of arcs.</strong>{' '}
            Solid arcs come from each later record's own section naming what it retires. The three
            dotted ones exist only in the index, because that section starts at 0009. Dashed edges
            to the right are the corrections that landed in <code>ARCHITECTURE.md</code>,{' '}
            <code>README.md</code> and code comments, which do get rewritten. 0020 is the busiest
            record, striking four others and five claims in 0019 alone. 0016 is the most amended,
            struck three times and still accepted.
          </figcaption>
          <div className="alt" id="d2-alt">
            <h3>The same diagram as a list</h3>
            <p>
              Three states: <em>intact</em>, <em>accepted with some claims struck</em>, and{' '}
              <em>moot</em>. Each entry names who struck it and, where the record states one, how
              many claims.
            </p>
            <ul>
              <li>0001, 0003, 0008, 0013, 0017, 0021: intact, no relations recorded.</li>
              <li>
                0002 <s>Stay on Vite 7</s>: moot since 0007, recorded only in the index.
              </li>
              <li>
                0004 React Native pivot: accepted, struck by 0009 (two claims: the zustand store
                count, and that the port was synchronous) and by 0018.
              </li>
              <li>
                0005 Expo over NativeScript: accepted, struck by 0011. The index also records that
                0006 amends it and 0007 carries it out.
              </li>
              <li>
                0006 One core, two hosts: accepted, struck by 0009 (two claims: the ports table, and
                the synchronous-KeyValueStore premise) and by 0015 (the CORS item).
              </li>
              <li>
                0007 Removing the NativeScript host: accepted, struck by 0011 (two claims) and by
                0015. The index records that it renders 0002 moot and carries out 0005.
              </li>
              <li>
                0009 Redux Toolkit for the core's state: intact. Strikes 0004 and 0006. The first
                record with a section naming what it retires.
              </li>
              <li>
                0010 Design tokens as a shared package: accepted, struck by 0022 (two claims).
              </li>
              <li>0011 Naming the app for release: intact. Strikes 0005 and 0007.</li>
              <li>
                0012 A list virtualizer: accepted, struck by 0015 (one table row's reason, the
                conclusion untouched) and by 0020.
              </li>
              <li>
                0014 The preview shell as a package: intact. Retired one claim in{' '}
                <code>README.md</code>.
              </li>
              <li>
                0015 Reading correctiv.org through its REST API: intact. Strikes 0006, 0007 and
                0012, and retired one claim in eighteen places across <code>ARCHITECTURE.md</code>,{' '}
                <code>apps/</code>, <code>.github/</code> and the tests.
              </li>
              <li>
                0016 A door at the root: accepted, struck by 0018 (two claims), 0019 and 0020.
              </li>
              <li>
                0018 Removing the guest: accepted, struck by 0019 (two claims) and 0020. Strikes
                0004 and 0016.
              </li>
              <li>
                0019 Identity lives in the session: accepted, struck by 0020 (five claims). Strikes
                0016 and 0018.
              </li>
              <li>0020 No contribution in the app: intact. Strikes 0012, 0016, 0018 and 0019.</li>
              <li>
                0022 Three tiers of colour: intact. Strikes 0010 and retired two claims in{' '}
                <code>ARCHITECTURE.md</code>.
              </li>
              <li>
                0023 The host constructs the store: intact. Strikes no record; corrected one claim
                in <code>ARCHITECTURE.md</code> and four code comments.
              </li>
            </ul>
            <p>
              Records never rewritten; the living documents <code>ARCHITECTURE.md</code>,{' '}
              <code>README.md</code> and code comments are rewritten in place and sit downstream of
              the decisions.
            </p>
          </div>
        </figure>
      </section>

      <section id="inside-core" aria-labelledby="h-inside-core">
        <h2 id="h-inside-core">3. Inside the core</h2>
        <p className="lede">
          Fifty-four TypeScript files in seven layers. Imports point down the stack, the contracts
          sit at the bottom, and below them is a line nothing in the package crosses.
        </p>
        <figure>
          <section className="diagram d3" aria-label="Diagram 3, scrollable" tabIndex={0}>
            <svg viewBox="0 0 1040 710" aria-labelledby="d3-title" aria-describedby="d3-alt">
              <title id="d3-title">
                Inside packages/app-core: stores over articles and media, over services and data,
                over lib, over the ports and types, with a hard boundary below and the platform SDKs
                on the far side of it
              </title>
              <defs>
                <marker
                  id="d3-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M0 0 L10 5 L0 10 z" className="mk" />
                </marker>
              </defs>

              <line x1="22" y1="84" x2="22" y2="556" className="wire" markerEnd="url(#d3-arrow)" />
              <text
                transform="rotate(-90 10 320)"
                x="10"
                y="320"
                textAnchor="middle"
                className="t11 muted"
              >
                imports point down the stack
              </text>

              <rect x="40" y="28" width="680" height="548" rx="8" className="box box-core" />
              <text x="60" y="56" className="mono b t16">
                packages/app-core
              </text>
              <text x="700" y="56" textAnchor="end" className="muted t12">
                54 TypeScript files
              </text>

              <rect x="56" y="80" width="648" height="84" rx="6" className="chip" />
              <text x="72" y="100" className="mono b t13">
                stores
              </text>
              <text x="140" y="100" className="t12 muted">
                one Redux Toolkit store, 12 slices
              </text>
              <text x="72" y="126" className="t12">
                The core owns the slices and exports{' '}
                <tspan className="mono">createAppStore()</tspan>.
              </text>
              <text x="72" y="146" className="t12">
                The host constructs the instance.
              </text>

              <rect x="56" y="180" width="440" height="110" rx="6" className="chip" />
              <text x="72" y="200" className="mono b t13">
                articles
              </text>
              <text x="150" y="200" className="t12 muted">
                the Article model and its load cascade
              </text>
              <text x="72" y="236" className="mono t11 muted">
                articles/extract
              </text>
              <rect x="72" y="250" width="56" height="24" rx="5" className="box" />
              <text x="100" y="262" textAnchor="middle" className="mono t12">
                string
              </text>
              <rect x="136" y="250" width="46" height="24" rx="5" className="box" />
              <text x="159" y="262" textAnchor="middle" className="mono t12">
                DOM
              </text>
              <text x="194" y="262" className="t12">
                two backends behind one <tspan className="mono">ArticleExtractor</tspan>
              </text>

              <rect x="512" y="180" width="192" height="110" rx="6" className="chip" />
              <text x="528" y="200" className="mono b t13">
                media
              </text>
              <text x="528" y="230" className="t12">
                one rule:
              </text>
              <text x="528" y="248" className="t12">
                only one medium
              </text>
              <text x="528" y="266" className="t12">
                plays at a time
              </text>

              <rect x="56" y="306" width="440" height="110" rx="6" className="chip" />
              <text x="72" y="326" className="mono b t13">
                services
              </text>
              <text x="150" y="326" className="t12 muted">
                10 files
              </text>
              <g className="mono t12">
                <rect x="72" y="344" width="44" height="24" rx="5" className="box" />
                <text x="94" y="356" textAnchor="middle">
                  auth
                </text>
                <rect x="122" y="344" width="52" height="24" rx="5" className="box" />
                <text x="148" y="356" textAnchor="middle">
                  cache
                </text>
                <rect x="180" y="344" width="44" height="24" rx="5" className="box" />
                <text x="202" y="356" textAnchor="middle">
                  http
                </text>
                <rect x="230" y="344" width="74" height="24" rx="5" className="box" />
                <text x="267" y="356" textAnchor="middle">
                  peertube
                </text>
                <rect x="310" y="344" width="66" height="24" rx="5" className="box" />
                <text x="343" y="356" textAnchor="middle">
                  podcast
                </text>
                <rect x="72" y="380" width="52" height="24" rx="5" className="box" />
                <text x="98" y="392" textAnchor="middle">
                  radio
                </text>
                <rect x="130" y="380" width="36" height="24" rx="5" className="box" />
                <text x="148" y="392" textAnchor="middle">
                  rss
                </text>
                <rect x="172" y="380" width="58" height="24" rx="5" className="box" />
                <text x="201" y="392" textAnchor="middle">
                  search
                </text>
                <rect x="236" y="380" width="80" height="24" rx="5" className="box" />
                <text x="276" y="392" textAnchor="middle">
                  spotlight
                </text>
                <rect x="322" y="380" width="30" height="24" rx="5" className="box" />
                <text x="337" y="392" textAnchor="middle">
                  wp
                </text>
              </g>

              <rect x="512" y="306" width="192" height="110" rx="6" className="chip" />
              <text x="528" y="326" className="mono b t13">
                data
              </text>
              <text x="580" y="326" className="t12 muted">
                11 files
              </text>
              <text x="528" y="356" className="t12">
                typed content,
              </text>
              <text x="528" y="374" className="t12">
                checked by the compiler
              </text>

              <rect x="56" y="432" width="648" height="44" rx="6" className="chip" />
              <text x="72" y="454" className="mono b t13">
                lib
              </text>
              <text x="120" y="454" className="t12">
                dependency-free string and date helpers
              </text>

              <rect x="56" y="492" width="648" height="68" rx="6" className="chip" />
              <text x="72" y="512" className="mono b t13">
                ports
              </text>
              <text x="128" y="512" className="mono t11 muted">
                ports/index.ts, 1 file
              </text>
              <g className="mono t12">
                <rect x="72" y="528" width="106" height="24" rx="5" className="chip-port" />
                <text x="125" y="540" textAnchor="middle">
                  KeyValueStore
                </text>
                <rect x="184" y="528" width="78" height="24" rx="5" className="chip-port" />
                <text x="223" y="540" textAnchor="middle">
                  BlobStore
                </text>
                <rect x="268" y="528" width="106" height="24" rx="5" className="chip-port" />
                <text x="321" y="540" textAnchor="middle">
                  ContentBundle
                </text>
                <rect x="380" y="528" width="98" height="24" rx="5" className="chip-port" />
                <text x="429" y="540" textAnchor="middle">
                  AudioBackend
                </text>
                <rect x="484" y="528" width="148" height="24" rx="5" className="box" />
                <text x="558" y="540" textAnchor="middle">
                  configurePlatform()
                </text>
              </g>
              <text x="700" y="512" textAnchor="end" className="mono b t13">
                types
              </text>
              <text x="700" y="540" textAnchor="end" className="t11 muted">
                the shared contracts
              </text>

              <line x1="40" y1="600" x2="720" y2="600" className="boundary" />
              <text x="40" y="622" className="t12 b">
                hard boundary, nothing crosses it
              </text>
              <text x="40" y="640" className="t12 muted">
                <tspan className="mono">packages/app-core/test/boundary.test.ts</tspan> fails the
                build if anything below is imported above this line
              </text>
              <g className="mono t12 muted">
                <rect x="40" y="660" width="100" height="30" rx="6" className="ghost" />
                <text x="90" y="675" textAnchor="middle">
                  react-native
                </text>
                <rect x="150" y="660" width="50" height="30" rx="6" className="ghost" />
                <text x="175" y="675" textAnchor="middle">
                  expo
                </text>
                <rect x="210" y="660" width="90" height="30" rx="6" className="ghost" />
                <text x="255" y="675" textAnchor="middle">
                  expo-audio
                </text>
                <rect x="310" y="660" width="210" height="30" rx="6" className="ghost" />
                <text x="415" y="675" textAnchor="middle">
                  @react-native-async-storage
                </text>
              </g>
              <text x="536" y="675" className="t11 muted">
                platform SDKs, reached by the host only
              </text>

              <rect x="740" y="80" width="280" height="84" rx="6" className="callout" />
              <line x1="740" y1="122" x2="704" y2="122" className="lead" />
              <text x="754" y="102" className="t11 muted">
                convention
              </text>
              <text x="754" y="122" className="t12">
                Derived values are exported selectors
              </text>
              <text x="754" y="140" className="t12">
                taking state, never store methods.
              </text>

              <rect x="740" y="476" width="280" height="100" rx="6" className="callout" />
              <line x1="740" y1="526" x2="704" y2="526" className="lead" />
              <text x="754" y="498" className="t11 muted">
                convention
              </text>
              <text x="754" y="518" className="t12">
                Subpath imports, no barrel:
              </text>
              <text x="754" y="538" className="mono t11">
                @correctiv/app-core/stores/session
              </text>
              <text x="754" y="558" className="t12">
                The root entry exposes only the ports.
              </text>
            </svg>
          </section>
          <figcaption>
            <strong>
              Every layer imports downward, and the lowest one is a set of interfaces.
            </strong>{' '}
            The ports are declared here and implemented outside; the SDKs under the red line are the
            host's business, and a test keeps them out. The root entry exports only the ports, so a
            host reaches anything else by its path.
          </figcaption>
          <div className="alt" id="d3-alt">
            <h3>The same diagram as a list</h3>
            <p>
              <code>packages/app-core</code>, 54 TypeScript files. Imports point down the stack.
              Layers from the top:
            </p>
            <ol>
              <li>
                <strong>stores</strong>: one Redux Toolkit store with 12 slices. The core owns the
                slices and exports <code>createAppStore()</code>; the host constructs the instance.
              </li>
              <li>
                <strong>articles</strong>: the Article model and its load cascade.{' '}
                <code>articles/extract</code> holds two backends, a string one and a DOM one, behind
                one <code>ArticleExtractor</code> type. Beside it, <strong>media</strong>, with one
                rule: only one medium plays at a time.
              </li>
              <li>
                <strong>services</strong>, 10 files: auth, cache, http, peertube, podcast, radio,
                rss, search, spotlight, wp. Beside it, <strong>data</strong>, 11 files of typed
                content.
              </li>
              <li>
                <strong>lib</strong>: dependency-free string and date helpers.
              </li>
              <li>
                <strong>ports</strong> and <strong>types</strong>, the contracts:{' '}
                <code>ports/index.ts</code>, one file, declares <code>KeyValueStore</code>,{' '}
                <code>BlobStore</code>, <code>ContentBundle</code>, <code>AudioBackend</code> and{' '}
                <code>configurePlatform()</code>.
              </li>
            </ol>
            <p>
              Below the contracts is a hard boundary. The platform SDKs (react-native, expo,
              expo-audio, async storage) sit on the far side and nothing in the package imports
              them; <code>packages/app-core/test/boundary.test.ts</code> fails the build if one
              appears.
            </p>
            <p>
              Two conventions: derived values are exported selectors taking state, never store
              methods. Imports use subpaths and no barrel, for example{' '}
              <code>@correctiv/app-core/stores/session</code>, because the root entry exposes only
              the ports.
            </p>
          </div>
        </figure>
      </section>
    </main>
  );
}
