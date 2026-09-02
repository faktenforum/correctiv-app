// The desktop build.
//
// ADR 0032 section 12: the build chain belongs to the consumer. gjsify supplies the
// plugins; this file is where this application composes them, and every entry below is
// a decision rather than boilerplate.

import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rnRouteManifestPlugin } from '@gjsify/rolldown-plugin-gjsify';

const HERE = dirname(fileURLToPath(import.meta.url));
const here = (...parts) => resolve(HERE, ...parts);
const shim = (name) => here('src/shims', name);

/**
 * Exact-match redirects. A bare specifier this application answers itself.
 *
 * NOT `--dialect react-native`, and that is the one genuinely awkward decision in this
 * build. The flag aliases `react-native` onto `@gjsify/react-native` and adds ADR 0032
 * section 8's build-time support gate, which is worth having — but its alias plugin is
 * `pre`, so it would also win over the redirect below, and this application needs a
 * layer in between: 110 call sites pass props the GTK layer refuses by name
 * (`hitSlop`, the five accessibility props, `pointerEvents="box-none"`), and
 * `src/shims/react-native.tsx` is where each gets ONE deliberate answer instead of 110
 * render-time throws.
 *
 * The gate is not given up. `test/support-gate.test.ts` reproduces it against the same
 * published support table, over this application's own source.
 *
 * It reproduces the IMPORT half only. This comment claimed the props half too, and that
 * was never true of either gate: a refused prop is a render-time throw per screen, and
 * three `<Typo onPress>` in `(tabs)/profil.tsx` went through this build, the typecheck
 * and that test green before ending the whole tree at startup. The test's own header
 * says what it does not cover, and names `@gjsify/react-native/prop-table` as what
 * closes it.
 */
const EXACT = {
  'react-native': shim('react-native.tsx'),
  'expo-router': shim('expo-router.ts'),
  uniwind: shim('uniwind.ts'),
  '@expo/vector-icons': shim('vector-icons.tsx'),

  // Only what `apps/mobile/src` actually imports. expo-linking, expo-web-browser,
  // expo-constants and expo-system-ui are declared in the app's package.json and
  // imported NOWHERE, so shimming them would be dead code pretending to be coverage.
  'expo-image': shim('expo-image.tsx'),
  'expo-video': shim('expo-video.tsx'),
  'expo-font': shim('expo-font.ts'),
  'expo-status-bar': shim('expo-status-bar.tsx'),
  'expo-splash-screen': shim('expo-splash-screen.ts'),
  'react-native-safe-area-context': shim('react-native-safe-area-context.tsx'),
  'react-native-gesture-handler': shim('react-native-gesture-handler.tsx'),
  'react-native-webview': shim('react-native-webview.tsx'),
  '@expo-google-fonts/merriweather': shim('expo-google-fonts.ts'),
  '@expo-google-fonts/source-sans-3': shim('expo-google-fonts.ts'),

  // Video is a placeholder on this host; the override's own header says why that is a
  // decision rather than a gap in the toolkit. Redirected by MODULE rather than forked
  // as a `.gtk.tsx` sibling, because a sibling would have to live inside
  // `apps/mobile/src`, where the app's typecheck and two of its recursive test guards
  // would each need an exception for it.
  '@/components/media/VideoFrame': here('src/overrides/VideoFrame.tsx'),

  // Uniwind's CSS entry. It is the file Uniwind's Metro transform reads, and there is
  // no Metro here — the class vocabulary reaches GTK through `configureStyle`. Nothing
  // in the desktop tree imports it, but a mobile module that grows the import should
  // find an empty module rather than a bundler that cannot parse CSS.
  '@/global.css': here('src/shims/empty.ts'),
};

/** Prefix redirects, longest first so `@/assets/` wins over `@/`. */
const PREFIX = [
  ['@/assets/', here('../mobile/assets/')],
  ['@/', here('../mobile/src/')],
  ['@correctiv/app-core/', here('../../packages/app-core/src/')],
  ['@correctiv/design-tokens/', here('../../packages/design-tokens/src/')],
];

/**
 * The extension search, and why it is here rather than left to the resolver.
 *
 * `@correctiv/app-core`'s exports map is `"./*": "./src/*"` — extensionless on
 * purpose, because it is only ever resolved by Metro and by this repo's tsconfig
 * paths, "both of which guess an extension" (ADR 0010). Nothing guesses once a
 * redirect has produced an absolute path, so this guesses.
 *
 * `.gtk.*` comes first, which is ADR 0032 section 9's platform chain: a
 * `Foo.gtk.tsx` beside a `Foo.tsx` wins on this host. Nothing uses it yet, and it
 * costs one array entry to leave the door open.
 *
 * The middle rung is the OS one, and leaving it out was a hole rather than a thrift.
 * gjsify's own `platformResolvePlugin` searches `['gtk', <os>, 'desktop']` — but it
 * answers RELATIVE imports only, and this plugin runs at `order: 'pre'`, so it wins for
 * every specifier the redirects above produce: every `@/…`, `@correctiv/app-core/…`,
 * `@correctiv/design-tokens/…`. Without the rung a `Foo.macos.tsx` beside a `Foo.tsx`
 * was INVISIBLE, with no error — and that shape is exactly what the macOS WebView needs,
 * so the hole was about to be stepped in.
 *
 * Order is load-bearing: `.gtk` → `.<os>` → `.desktop` → bare, most specific host first.
 * `.native` and `.web` stay OUT — they belong to Metro and to the web target, and
 * gjsify's own chain refuses them by name for the same reason.
 */
const OS_SUFFIX = { linux: 'linux', darwin: 'macos', win32: 'windows' }[process.platform];
const EXTENSIONS = [
  '.gtk',
  ...(OS_SUFFIX === undefined ? [] : [`.${OS_SUFFIX}`]),
  '.desktop',
  '',
].flatMap((platform) =>
  ['.tsx', '.ts', '.mjs', '.js', '.json'].map((extension) => `${platform}${extension}`),
);

function withExtension(base) {
  if (existsSync(base) && !statSync(base).isDirectory()) return base;
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) return candidate;
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const extension of EXTENSIONS) {
      const candidate = resolve(base, `index${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * The redirects, as a plugin.
 *
 * A PLUGIN rather than `bundler.resolve.alias`, and that is measured rather than
 * preferred: the alias table in this file's first version was ignored outright — the
 * build pulled the real `react-native` (`PARSE_ERROR: Flow is not supported`) and the
 * real `@expo/vector-icons` with its eight `.ttf` imports. A `resolveId` hook at
 * `order: 'pre'` is honoured.
 */
function redirectPlugin() {
  return {
    name: 'correctiv-desktop-redirects',
    resolveId: {
      order: 'pre',
      handler(source) {
        const exact = EXACT[source];
        if (exact !== undefined) return exact;
        for (const [prefix, target] of PREFIX) {
          if (!source.startsWith(prefix)) continue;
          const resolved = withExtension(resolve(target, source.slice(prefix.length)));
          if (resolved !== null) return resolved;
        }
        // `@correctiv/app-core` and `@correctiv/design-tokens` with no subpath.
        if (source === '@correctiv/app-core') return here('../../packages/app-core/src/index.ts');
        if (source === '@correctiv/design-tokens') {
          return here('../../packages/design-tokens/src/index.ts');
        }
        return null;
      },
    },
  };
}

export default {
  bundler: {
    /**
     * Compile-time substitutions, HERE rather than on the command line, because there
     * are now two build targets and a `--define` repeated per target is a define that
     * will eventually differ between them. `transform.define` is the only place
     * Rolldown reads (a top-level `bundler.define` is auto-mapped with a warning).
     *
     * Both entries are load-bearing, not hygiene. `@reduxjs/toolkit`'s ESM build reads
     * `process.env.NODE_ENV` in 57 places; undefined there re-enables `serializableCheck`,
     * which the store deliberately narrows because the audio backend dispatches twice a
     * second against a tree holding six feeds and seven podcast series.
     *
     * The value side is a JS EXPRESSION, so a string needs its own quotes.
     */
    transform: {
      define: {
        'process.env.NODE_ENV': '"production"',
        __DEV__: 'false',
      },
    },
    plugins: [
      redirectPlugin(),
      // expo-router discovers routes with Metro's `require.context`, which does not
      // exist in this chain. This walks `src/app` instead and emits one module that
      // statically imports every route file, which `@gjsify/react-native/router` turns
      // into a tree using expo-router's own four file conventions.
      rnRouteManifestPlugin({ routesDir: here('src/app') }),
    ],
  },
};
