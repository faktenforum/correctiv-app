import { CoreAndHost } from '../diagrams/CoreAndHost';
import {
  ALT,
  ARC,
  ARC_DOC,
  ARC_INDEX,
  AXIS,
  BOLD,
  BOUNDARY,
  BOX,
  BOX_CORE,
  CALLOUT,
  CAPTION,
  CHIP,
  CHIP_PORT,
  DASHED,
  DRAWING,
  FIGURE,
  GHOST,
  HALO,
  HATCH,
  HEADING,
  LEAD,
  LEDE,
  MARKER,
  MARKER_LIGHT,
  MONO,
  MUTED,
  NODE_INTACT,
  NODE_MOOT,
  NODE_QUIET,
  NODE_STRUCK,
  PROSE_CODE,
  RULE,
  SCROLL_BOX,
  SECTION,
  STRIKE,
  T11,
  T12,
  T13,
  T16,
  WIRE,
} from '../diagrams/shared';
import { cn } from '../lib/cn';

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
    <div className="px-m py-ml lg:px-12">
      {/*
        The fragment ids a reader may arrive on sit on the sections themselves.
        The design carried them on an empty anchor before the heading, which is an
        anchor with neither content nor destination, and a section is the thing
        the link means anyway.
      */}
      <section id="core-host" aria-labelledby="h-core-host" className={SECTION}>
        <h2 id="h-core-host" className={HEADING}>
          1. The core and its host
        </h2>
        <p className={LEDE}>
          All behaviour on one side, all platform on the other. The only crossing is four named
          ports, and the adapter that answers them is one small file.
        </p>
        <CoreAndHost />
      </section>

      <section id="decisions" aria-labelledby="h-decisions" className={SECTION}>
        <h2 id="h-decisions" className={HEADING}>
          2. Which decisions still stand, and which of their claims do not
        </h2>
        <p className={LEDE}>
          Twenty-three records, never rewritten. When a later decision makes an earlier claim false,
          the claim is struck through where it stands and the later record names what it retired.
          Read a row to see whether a record still holds; follow the arcs to see who amended it.
        </p>
        <figure className={FIGURE}>
          <section className={SCROLL_BOX} aria-label="Diagram 2, scrollable" tabIndex={0}>
            <svg
              viewBox="0 0 1100 985"
              className={cn(DRAWING, 'block h-[985px] w-[1100px] max-w-none')}
              aria-labelledby="d2-title"
              aria-describedby="d2-alt"
            >
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
                  <path d="M0 0 L10 5 L0 10 z" className={MARKER} />
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
                  <path d="M0 0 L10 5 L0 10 z" className={MARKER_LIGHT} />
                </marker>
                <pattern
                  id="d2-hatch"
                  patternUnits="userSpaceOnUse"
                  width="5"
                  height="5"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="5" className={HATCH} />
                </pattern>
              </defs>

              <text x="330" y="40" textAnchor="end" className={cn(T11, MUTED)}>
                a later record strikes a claim in an earlier one
              </text>
              <text x="360" y="40" className={cn(T11, MUTED)}>
                record
              </text>
              <text x="412" y="40" className={cn(T11, MUTED)}>
                title
              </text>
              <text x="700" y="40" className={cn(T11, MUTED)}>
                claims struck by
              </text>

              <line x1="340" y1="70" x2="340" y2="818" className={AXIS} />

              <g className={ARC_INDEX}>
                <path d="M330 274 C 210 274 210 104 330 104" markerEnd="url(#d2-arrow-light)" />
                <path d="M330 240 C 282 240 282 206 330 206" markerEnd="url(#d2-arrow-light)" />
                <path d="M330 274 C 264 274 264 206 330 206" markerEnd="url(#d2-arrow-light)" />
              </g>
              <text x="236" y="189" textAnchor="end" className={cn(T11, MUTED, HALO)}>
                index: moot
              </text>
              <text x="290" y="223" textAnchor="end" className={cn(T11, MUTED, HALO)}>
                index: amends
              </text>
              <text x="276" y="240" textAnchor="end" className={cn(T11, MUTED, HALO)}>
                index: carries out
              </text>

              <g className={ARC}>
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
              <g className={cn(T11, HALO)}>
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

              <g className={T13}>
                <circle cx="340" cy="70" r="3.5" className={NODE_QUIET} />
                <text x="360" y="70" className={cn(MONO, T12, MUTED)}>
                  0001
                </text>

                <circle cx="340" cy="104" r="8" className={NODE_MOOT} />
                <text x="360" y="104" className={cn(MONO, BOLD, MUTED)}>
                  0002
                </text>
                <text x="412" y="104" className={STRIKE}>
                  Stay on Vite 7
                </text>
                <text x="700" y="104" className={cn(MONO, T12, MUTED)}>
                  moot since 0007, per the index
                </text>

                <circle cx="340" cy="138" r="3.5" className={NODE_QUIET} />
                <text x="360" y="138" className={cn(MONO, T12, MUTED)}>
                  0003
                </text>

                <circle cx="340" cy="172" r="8" className={NODE_STRUCK} />
                <text x="360" y="172" className={cn(MONO, BOLD)}>
                  0004
                </text>
                <text x="412" y="172">
                  React Native pivot
                </text>
                <text x="700" y="172" className={cn(MONO, T12, MUTED)}>
                  0009, 0018
                </text>

                <circle cx="340" cy="206" r="8" className={NODE_STRUCK} />
                <text x="360" y="206" className={cn(MONO, BOLD)}>
                  0005
                </text>
                <text x="412" y="206">
                  Expo over NativeScript
                </text>
                <text x="700" y="206" className={cn(MONO, T12, MUTED)}>
                  0011; index: 0006, 0007
                </text>

                <circle cx="340" cy="240" r="8" className={NODE_STRUCK} />
                <text x="360" y="240" className={cn(MONO, BOLD)}>
                  0006
                </text>
                <text x="412" y="240">
                  One core, two hosts
                </text>
                <text x="700" y="240" className={cn(MONO, T12, MUTED)}>
                  0009, 0015
                </text>

                <circle cx="340" cy="274" r="8" className={NODE_STRUCK} />
                <text x="360" y="274" className={cn(MONO, BOLD)}>
                  0007
                </text>
                <text x="412" y="274">
                  Removing the NativeScript host
                </text>
                <text x="700" y="274" className={cn(MONO, T12, MUTED)}>
                  0011, 0015
                </text>

                <circle cx="340" cy="308" r="3.5" className={NODE_QUIET} />
                <text x="360" y="308" className={cn(MONO, T12, MUTED)}>
                  0008
                </text>

                <circle cx="340" cy="342" r="8" className={NODE_INTACT} />
                <text x="360" y="342" className={cn(MONO, BOLD)}>
                  0009
                </text>
                <text x="412" y="342" className={MUTED}>
                  Redux Toolkit for the core's state
                </text>

                <circle cx="340" cy="376" r="8" className={NODE_STRUCK} />
                <text x="360" y="376" className={cn(MONO, BOLD)}>
                  0010
                </text>
                <text x="412" y="376">
                  Design tokens as a shared package
                </text>
                <text x="700" y="376" className={cn(MONO, T12, MUTED)}>
                  0022
                </text>

                <circle cx="340" cy="410" r="8" className={NODE_INTACT} />
                <text x="360" y="410" className={cn(MONO, BOLD)}>
                  0011
                </text>
                <text x="412" y="410">
                  Naming the app for release
                </text>

                <circle cx="340" cy="444" r="8" className={NODE_STRUCK} />
                <text x="360" y="444" className={cn(MONO, BOLD)}>
                  0012
                </text>
                <text x="412" y="444">
                  A list virtualizer
                </text>
                <text x="700" y="444" className={cn(MONO, T12, MUTED)}>
                  0015, 0020
                </text>

                <circle cx="340" cy="478" r="3.5" className={NODE_QUIET} />
                <text x="360" y="478" className={cn(MONO, T12, MUTED)}>
                  0013
                </text>

                <circle cx="340" cy="512" r="8" className={NODE_INTACT} />
                <text x="360" y="512" className={cn(MONO, BOLD)}>
                  0014
                </text>
                <text x="412" y="512">
                  The preview shell as a package
                </text>

                <circle cx="340" cy="546" r="8" className={NODE_INTACT} />
                <text x="360" y="546" className={cn(MONO, BOLD)}>
                  0015
                </text>
                <text x="412" y="546">
                  Reading correctiv.org through its REST API
                </text>

                <circle cx="340" cy="580" r="8" className={NODE_STRUCK} />
                <text x="360" y="580" className={cn(MONO, BOLD)}>
                  0016
                </text>
                <text x="412" y="580">
                  A door at the root
                </text>
                <text x="700" y="580" className={cn(MONO, T12, MUTED)}>
                  0018, 0019, 0020
                </text>

                <circle cx="340" cy="614" r="3.5" className={NODE_QUIET} />
                <text x="360" y="614" className={cn(MONO, T12, MUTED)}>
                  0017
                </text>

                <circle cx="340" cy="648" r="8" className={NODE_STRUCK} />
                <text x="360" y="648" className={cn(MONO, BOLD)}>
                  0018
                </text>
                <text x="412" y="648">
                  Removing the guest
                </text>
                <text x="700" y="648" className={cn(MONO, T12, MUTED)}>
                  0019, 0020
                </text>

                <circle cx="340" cy="682" r="8" className={NODE_STRUCK} />
                <text x="360" y="682" className={cn(MONO, BOLD)}>
                  0019
                </text>
                <text x="412" y="682">
                  Identity lives in the session
                </text>
                <text x="700" y="682" className={cn(MONO, T12, MUTED)}>
                  0020
                </text>

                <circle cx="340" cy="716" r="8" className={NODE_INTACT} />
                <text x="360" y="716" className={cn(MONO, BOLD)}>
                  0020
                </text>
                <text x="412" y="716">
                  No contribution in the app
                </text>

                <circle cx="340" cy="750" r="3.5" className={NODE_QUIET} />
                <text x="360" y="750" className={cn(MONO, T12, MUTED)}>
                  0021
                </text>

                <circle cx="340" cy="784" r="8" className={NODE_INTACT} />
                <text x="360" y="784" className={cn(MONO, BOLD)}>
                  0022
                </text>
                <text x="412" y="784">
                  Three tiers of colour
                </text>

                <circle cx="340" cy="818" r="8" className={NODE_INTACT} />
                <text x="360" y="818" className={cn(MONO, BOLD)}>
                  0023
                </text>
                <text x="412" y="818">
                  The host constructs the store
                </text>
              </g>

              <rect x="888" y="470" width="204" height="352" rx="10" className={DASHED} />
              <text x="990" y="470" textAnchor="middle" className={cn(T11, MUTED, HALO)}>
                living documents
              </text>
              <text x="990" y="492" textAnchor="middle" className={cn(T11, MUTED)}>
                rewritten in place, unlike a record
              </text>
              <rect x="900" y="514" width="180" height="30" rx="6" className={CHIP} />
              <text x="990" y="529" textAnchor="middle" className={cn(MONO, T12)}>
                README.md
              </text>
              <rect x="900" y="604" width="180" height="30" rx="6" className={CHIP} />
              <text x="990" y="619" textAnchor="middle" className={cn(MONO, T12)}>
                ARCHITECTURE.md
              </text>
              <text x="990" y="650" textAnchor="middle" className={cn(T11, MUTED)}>
                0015 also: apps/, .github/, tests
              </text>
              <rect x="900" y="776" width="180" height="30" rx="6" className={CHIP} />
              <text x="990" y="791" textAnchor="middle" className={T12}>
                code comments
              </text>

              <g className={ARC_DOC}>
                <path d="M700 512 C 800 512 800 529 896 529" markerEnd="url(#d2-arrow)" />
                <path d="M700 546 C 800 546 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 784 C 800 784 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 818 C 800 818 800 619 896 619" markerEnd="url(#d2-arrow)" />
                <path d="M700 818 C 800 818 800 791 896 791" markerEnd="url(#d2-arrow)" />
              </g>
              <g className={cn(T11, HALO)}>
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

              <line x1="40" y1="848" x2="1092" y2="848" className={RULE} />
              <g className={T12}>
                <circle cx="60" cy="872" r="8" className={NODE_INTACT} />
                <text x="76" y="872">
                  accepted, intact
                </text>
                <circle cx="260" cy="872" r="8" className={NODE_STRUCK} />
                <text x="276" y="872">
                  accepted, some claims struck through in place
                </text>
                <circle cx="600" cy="872" r="8" className={NODE_MOOT} />
                <text x="616" y="872">
                  <tspan className={STRIKE}>moot</tspan>, superseded in substance
                </text>
                <line
                  x1="40"
                  y1="908"
                  x2="96"
                  y2="908"
                  className={ARC}
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
                  className={ARC_INDEX}
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
                  className={ARC_DOC}
                  markerEnd="url(#d2-arrow)"
                />
                <text x="108" y="964">
                  a claim struck in a living document, which is rewritten rather than annotated
                </text>
              </g>
            </svg>
          </section>
          <figcaption className={CAPTION}>
            <strong>A record is amended, never rewritten, so its history is a set of arcs.</strong>{' '}
            Solid arcs come from each later record's own section naming what it retires. The three
            dotted ones exist only in the index, because that section starts at 0009. Dashed edges
            to the right are the corrections that landed in <code>ARCHITECTURE.md</code>,{' '}
            <code>README.md</code> and code comments, which do get rewritten. 0020 is the busiest
            record, striking four others and five claims in 0019 alone. 0016 is the most amended,
            struck three times and still accepted.
          </figcaption>
          <div className={ALT} id="d2-alt">
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

      <section id="services" aria-labelledby="h-services" className={SECTION}>
        <h2 id="h-services" className={HEADING}>
          3. The app and what it talks to
        </h2>
        <p className={LEDE}>
          One of these is not like the others. beabee answers who somebody is and whether their
          membership includes the app; everything else answers what to show them. Most of the
          content is live today, and the identity half is still simulated.
        </p>
        <figure className={FIGURE}>
          <section className={SCROLL_BOX} aria-label="Diagram 4, scrollable" tabIndex={0}>
            <svg viewBox="0 0 980 580" className={cn(DRAWING, 'h-auto w-[980px]')}>
              <title>
                The app, the identity system it asks about membership, and the content sources it
                reads
              </title>

              <defs>
                <marker
                  id="d4-arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L8 4 L0 8 z" className={MARKER} />
                </marker>
              </defs>

              {/* The app, drawn once, because both halves ask the same questions. */}
              <rect x="24" y="196" width="216" height="128" rx="8" className={BOX_CORE} />
              <text x="44" y="226" className={cn(MONO, BOLD)} fontSize="14">
                the app
              </text>
              <text x="44" y="252" className={MONO} fontSize="12">
                packages/app-core
              </text>
              <text x="44" y="272" className={MONO} fontSize="12">
                apps/mobile
              </text>
              <text x="44" y="300" className={MUTED} fontSize="12">
                every request below is the core&apos;s
              </text>

              {/* The door. Above the rest and on its own wire, because it is the
                  only one whose answer decides whether the app renders at all. */}
              <rect x="612" y="28" width="344" height="112" rx="8" className={CHIP_PORT} />
              <text x="632" y="58" className={BOLD} fontSize="14">
                beabee
              </text>
              <text x="632" y="80" fontSize="12">
                identity and membership
              </text>
              <text x="632" y="102" className={MUTED} fontSize="12">
                one login for website and app: the tier, whether
              </text>
              <text x="632" y="120" className={MUTED} fontSize="12">
                the app is included, why, and for how long
              </text>

              <path
                d="M240 232 C 420 232, 440 84, 612 84"
                className={WIRE}
                markerEnd="url(#d4-arrow)"
              />
              <text x="404" y="140" className={cn(MUTED, HALO)} fontSize="12">
                who is this, and may they be here
              </text>
              <rect x="612" y="150" width="150" height="22" rx="11" className={NODE_STRUCK} />
              <text x="628" y="162" fontSize="11">
                simulated today
              </text>
              <text x="774" y="162" className={MUTED} fontSize="11">
                services/auth.service.ts
              </text>

              {/* Content, in one band, because the app treats it all the same way. */}
              <line x1="300" y1="200" x2="956" y2="200" className={RULE} />
              <text x="300" y="188" className={cn(MUTED, BOLD)} fontSize="11">
                CONTENT
              </text>

              {[
                {
                  y: 214,
                  name: 'correctiv.org',
                  detail: 'WordPress REST: posts, newsletters, search',
                  state: 'live',
                },
                {
                  y: 254,
                  name: 'salon5.correctiv.net',
                  detail: 'Castopod, podcast RSS per show',
                  state: 'live',
                },
                {
                  y: 294,
                  name: 'icecast.correctiv.net',
                  detail: 'live radio, three mounts',
                  state: 'live',
                },
                {
                  y: 334,
                  name: 'tube.funfacts.de',
                  detail: 'PeerTube, nine channels',
                  state: 'live',
                },
                { y: 374, name: 'YouTube', detail: 'Atom feeds', state: 'live' },
                { y: 414, name: 'Faktenforum', detail: 'GraphQL, the claims', state: 'sample' },
                {
                  y: 454,
                  name: 'abriss-atlas.de',
                  detail: 'no public API exists',
                  state: 'sample',
                },
                { y: 494, name: 'beabee CrowdNewsroom', detail: 'the callouts', state: 'sample' },
              ].map((row) => (
                <g key={row.name}>
                  <path
                    d={`M240 260 C 300 260, 300 ${row.y}, 360 ${row.y}`}
                    className={row.state === 'live' ? WIRE : ARC_INDEX}
                    markerEnd="url(#d4-arrow)"
                  />
                  <circle
                    cx="372"
                    cy={row.y}
                    r="4"
                    className={row.state === 'live' ? NODE_INTACT : NODE_MOOT}
                  />
                  <text x="390" y={row.y} className={cn(MONO, BOLD)} fontSize="12">
                    {row.name}
                  </text>
                  <text x="612" y={row.y} className={MUTED} fontSize="12">
                    {row.detail}
                  </text>
                </g>
              ))}

              {/* The legend, because two line weights and two node fills are two
                  distinctions and neither is obvious from the drawing alone. */}
              <line x1="360" y1="524" x2="956" y2="524" className={RULE} />
              <circle cx="372" cy="548" r="4" className={NODE_INTACT} />
              <text x="390" y="548" fontSize="11">
                live today, over the network
              </text>
              <circle cx="612" cy="548" r="4" className={NODE_MOOT} />
              <text x="630" y="548" fontSize="11">
                a checked-in file, shaped like the API that will replace it
              </text>
            </svg>
          </section>

          <figcaption className={CAPTION}>
            <strong>beabee is the door; the rest is what is behind it.</strong> Its answer decides
            whether the app renders its routes at all, which no content source does, so it is drawn
            on its own wire. That answer is simulated today, in{' '}
            <code className={PROSE_CODE}>services/auth.service.ts</code>, and the shape of the
            answer is the contract. Five content sources are live; three are files typed in the
            shape of the API meant to replace them. Which is which, and the figures behind each, is
            the{' '}
            <a href="/sources" className="underline decoration-accent underline-offset-2">
              sources board
            </a>
            .
          </figcaption>
        </figure>

        <div className={ALT}>
          <p className="font-semibold">The same diagram as a list</p>
          <p className="mt-xs">
            <strong>beabee, identity and membership.</strong> One login for the website and the app.
            It answers with the tier, whether the app is included, why, and for how long. The app
            asks it once at the door and renders its routes only on a yes. Simulated today in{' '}
            <code className={PROSE_CODE}>packages/app-core/src/services/auth.service.ts</code>;
            nothing reaches a network, and the screen that calls it says so.
          </p>
          <p className="mt-xs font-semibold">Content the app reads live</p>
          <ul className="mt-3xs list-disc pl-m">
            <li>
              <code className={PROSE_CODE}>correctiv.org</code>, WordPress REST: articles by
              category, the newsletter archive, and search.
            </li>
            <li>
              <code className={PROSE_CODE}>salon5.correctiv.net</code>, CORRECTIV&apos;s own
              Castopod, standard podcast RSS per show.
            </li>
            <li>
              <code className={PROSE_CODE}>icecast.correctiv.net</code>, live radio, three mounts.
            </li>
            <li>
              <code className={PROSE_CODE}>tube.funfacts.de</code>, CORRECTIV&apos;s own PeerTube,
              nine channels.
            </li>
            <li>YouTube, Atom feeds.</li>
          </ul>
          <p className="mt-xs font-semibold">Content that is a file standing in for a service</p>
          <ul className="mt-3xs list-disc pl-m">
            <li>Faktenforum, a GraphQL backend, for the claims.</li>
            <li>abriss-atlas.de, which has no public API.</li>
            <li>beabee CrowdNewsroom, for the callouts.</li>
          </ul>
          <p className="mt-xs">
            The counts, the dates each figure was measured on, and the wanted features with no
            source at all are on the sources board.
          </p>
        </div>
      </section>

      <section id="inside-core" aria-labelledby="h-inside-core" className={SECTION}>
        <h2 id="h-inside-core" className={HEADING}>
          4. Inside the core
        </h2>
        <p className={LEDE}>
          Fifty-four TypeScript files in seven layers. Imports point down the stack, the contracts
          sit at the bottom, and below them is a line nothing in the package crosses.
        </p>
        <figure className={FIGURE}>
          <section className={SCROLL_BOX} aria-label="Diagram 3, scrollable" tabIndex={0}>
            <svg
              viewBox="0 0 1040 710"
              className={cn(DRAWING, 'block h-[710px] w-[1040px] max-w-none')}
              aria-labelledby="d3-title"
              aria-describedby="d3-alt"
            >
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
                  <path d="M0 0 L10 5 L0 10 z" className={MARKER} />
                </marker>
              </defs>

              <line x1="22" y1="84" x2="22" y2="556" className={WIRE} markerEnd="url(#d3-arrow)" />
              <text
                transform="rotate(-90 10 320)"
                x="10"
                y="320"
                textAnchor="middle"
                className={cn(T11, MUTED)}
              >
                imports point down the stack
              </text>

              <rect x="40" y="28" width="680" height="548" rx="8" className={BOX_CORE} />
              <text x="60" y="56" className={cn(MONO, BOLD, T16)}>
                packages/app-core
              </text>
              <text x="700" y="56" textAnchor="end" className={cn(MUTED, T12)}>
                54 TypeScript files
              </text>

              <rect x="56" y="80" width="648" height="84" rx="6" className={CHIP} />
              <text x="72" y="100" className={cn(MONO, BOLD, T13)}>
                stores
              </text>
              <text x="140" y="100" className={cn(T12, MUTED)}>
                one Redux Toolkit store, 12 slices
              </text>
              <text x="72" y="126" className={T12}>
                The core owns the slices and exports{' '}
                <tspan className={MONO}>createAppStore()</tspan>.
              </text>
              <text x="72" y="146" className={T12}>
                The host constructs the instance.
              </text>

              <rect x="56" y="180" width="440" height="110" rx="6" className={CHIP} />
              <text x="72" y="200" className={cn(MONO, BOLD, T13)}>
                articles
              </text>
              <text x="150" y="200" className={cn(T12, MUTED)}>
                the Article model and its load cascade
              </text>
              <text x="72" y="236" className={cn(MONO, T11, MUTED)}>
                articles/extract
              </text>
              <rect x="72" y="250" width="56" height="24" rx="5" className={BOX} />
              <text x="100" y="262" textAnchor="middle" className={cn(MONO, T12)}>
                string
              </text>
              <rect x="136" y="250" width="46" height="24" rx="5" className={BOX} />
              <text x="159" y="262" textAnchor="middle" className={cn(MONO, T12)}>
                DOM
              </text>
              <text x="194" y="262" className={T12}>
                two backends behind one <tspan className={MONO}>ArticleExtractor</tspan>
              </text>

              <rect x="512" y="180" width="192" height="110" rx="6" className={CHIP} />
              <text x="528" y="200" className={cn(MONO, BOLD, T13)}>
                media
              </text>
              <text x="528" y="230" className={T12}>
                one rule:
              </text>
              <text x="528" y="248" className={T12}>
                only one medium
              </text>
              <text x="528" y="266" className={T12}>
                plays at a time
              </text>

              <rect x="56" y="306" width="440" height="110" rx="6" className={CHIP} />
              <text x="72" y="326" className={cn(MONO, BOLD, T13)}>
                services
              </text>
              <text x="150" y="326" className={cn(T12, MUTED)}>
                10 files
              </text>
              <g className={cn(MONO, T12)}>
                <rect x="72" y="344" width="44" height="24" rx="5" className={BOX} />
                <text x="94" y="356" textAnchor="middle">
                  auth
                </text>
                <rect x="122" y="344" width="52" height="24" rx="5" className={BOX} />
                <text x="148" y="356" textAnchor="middle">
                  cache
                </text>
                <rect x="180" y="344" width="44" height="24" rx="5" className={BOX} />
                <text x="202" y="356" textAnchor="middle">
                  http
                </text>
                <rect x="230" y="344" width="74" height="24" rx="5" className={BOX} />
                <text x="267" y="356" textAnchor="middle">
                  peertube
                </text>
                <rect x="310" y="344" width="66" height="24" rx="5" className={BOX} />
                <text x="343" y="356" textAnchor="middle">
                  podcast
                </text>
                <rect x="72" y="380" width="52" height="24" rx="5" className={BOX} />
                <text x="98" y="392" textAnchor="middle">
                  radio
                </text>
                <rect x="130" y="380" width="36" height="24" rx="5" className={BOX} />
                <text x="148" y="392" textAnchor="middle">
                  rss
                </text>
                <rect x="172" y="380" width="58" height="24" rx="5" className={BOX} />
                <text x="201" y="392" textAnchor="middle">
                  search
                </text>
                <rect x="236" y="380" width="80" height="24" rx="5" className={BOX} />
                <text x="276" y="392" textAnchor="middle">
                  spotlight
                </text>
                <rect x="322" y="380" width="30" height="24" rx="5" className={BOX} />
                <text x="337" y="392" textAnchor="middle">
                  wp
                </text>
              </g>

              <rect x="512" y="306" width="192" height="110" rx="6" className={CHIP} />
              <text x="528" y="326" className={cn(MONO, BOLD, T13)}>
                data
              </text>
              <text x="580" y="326" className={cn(T12, MUTED)}>
                11 files
              </text>
              <text x="528" y="356" className={T12}>
                typed content,
              </text>
              <text x="528" y="374" className={T12}>
                checked by the compiler
              </text>

              <rect x="56" y="432" width="648" height="44" rx="6" className={CHIP} />
              <text x="72" y="454" className={cn(MONO, BOLD, T13)}>
                lib
              </text>
              <text x="120" y="454" className={T12}>
                dependency-free string and date helpers
              </text>

              <rect x="56" y="492" width="648" height="68" rx="6" className={CHIP} />
              <text x="72" y="512" className={cn(MONO, BOLD, T13)}>
                ports
              </text>
              <text x="128" y="512" className={cn(MONO, T11, MUTED)}>
                ports/index.ts, 1 file
              </text>
              <g className={cn(MONO, T12)}>
                <rect x="72" y="528" width="106" height="24" rx="5" className={CHIP_PORT} />
                <text x="125" y="540" textAnchor="middle">
                  KeyValueStore
                </text>
                <rect x="184" y="528" width="78" height="24" rx="5" className={CHIP_PORT} />
                <text x="223" y="540" textAnchor="middle">
                  BlobStore
                </text>
                <rect x="268" y="528" width="106" height="24" rx="5" className={CHIP_PORT} />
                <text x="321" y="540" textAnchor="middle">
                  ContentBundle
                </text>
                <rect x="380" y="528" width="98" height="24" rx="5" className={CHIP_PORT} />
                <text x="429" y="540" textAnchor="middle">
                  AudioBackend
                </text>
                <rect x="484" y="528" width="148" height="24" rx="5" className={BOX} />
                <text x="558" y="540" textAnchor="middle">
                  configurePlatform()
                </text>
              </g>
              <text x="700" y="512" textAnchor="end" className={cn(MONO, BOLD, T13)}>
                types
              </text>
              <text x="700" y="540" textAnchor="end" className={cn(T11, MUTED)}>
                the shared contracts
              </text>

              <line x1="40" y1="600" x2="720" y2="600" className={BOUNDARY} />
              <text x="40" y="622" className={cn(T12, BOLD)}>
                hard boundary, nothing crosses it
              </text>
              <text x="40" y="640" className={cn(T12, MUTED)}>
                <tspan className={MONO}>packages/app-core/test/boundary.test.ts</tspan> fails the
                build if anything below is imported above this line
              </text>
              <g className={cn(MONO, T12, MUTED)}>
                <rect x="40" y="660" width="100" height="30" rx="6" className={GHOST} />
                <text x="90" y="675" textAnchor="middle">
                  react-native
                </text>
                <rect x="150" y="660" width="50" height="30" rx="6" className={GHOST} />
                <text x="175" y="675" textAnchor="middle">
                  expo
                </text>
                <rect x="210" y="660" width="90" height="30" rx="6" className={GHOST} />
                <text x="255" y="675" textAnchor="middle">
                  expo-audio
                </text>
                <rect x="310" y="660" width="210" height="30" rx="6" className={GHOST} />
                <text x="415" y="675" textAnchor="middle">
                  @react-native-async-storage
                </text>
              </g>
              <text x="536" y="675" className={cn(T11, MUTED)}>
                platform SDKs, reached by the host only
              </text>

              <rect x="740" y="80" width="280" height="84" rx="6" className={CALLOUT} />
              <line x1="740" y1="122" x2="704" y2="122" className={LEAD} />
              <text x="754" y="102" className={cn(T11, MUTED)}>
                convention
              </text>
              <text x="754" y="122" className={T12}>
                Derived values are exported selectors
              </text>
              <text x="754" y="140" className={T12}>
                taking state, never store methods.
              </text>

              <rect x="740" y="476" width="280" height="100" rx="6" className={CALLOUT} />
              <line x1="740" y1="526" x2="704" y2="526" className={LEAD} />
              <text x="754" y="498" className={cn(T11, MUTED)}>
                convention
              </text>
              <text x="754" y="518" className={T12}>
                Subpath imports, no barrel:
              </text>
              <text x="754" y="538" className={cn(MONO, T11)}>
                @correctiv/app-core/stores/session
              </text>
              <text x="754" y="558" className={T12}>
                The root entry exposes only the ports.
              </text>
            </svg>
          </section>
          <figcaption className={CAPTION}>
            <strong>
              Every layer imports downward, and the lowest one is a set of interfaces.
            </strong>{' '}
            The ports are declared here and implemented outside; the SDKs under the red line are the
            host's business, and a test keeps them out. The root entry exports only the ports, so a
            host reaches anything else by its path.
          </figcaption>
          <div className={ALT} id="d3-alt">
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
    </div>
  );
}
