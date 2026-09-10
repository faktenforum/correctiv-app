/**
 * The component gallery: every component in `src/components`, in one scroll.
 *
 * A page for developers and designers, published like any other route: see
 * `src/app/gallery.tsx` for what that costs and for how to reach it while the
 * dev server is running.
 *
 * ## Why the chrome uses the app's own components
 *
 * The labels are `Typo` and `Overline` rather than a bare `Text`, which means a
 * fault in `Typo` disfigures the gallery's own furniture as well as its specimens.
 * That is the lesser risk: no screen in this app sets a text colour through a
 * class, so `text-on-canvas` is an untravelled path, and a gallery whose labels
 * were the first thing to use it would be reporting on itself. The specimens are
 * separated from the chrome by being boxed and outlined instead.
 *
 * ## Why each specimen is drawn twice
 *
 * Once on `canvas` and once on `surface`. A component that reaches for a primitive
 * where it meant a semantic token — `bg-white` for `bg-canvas` — looks right on
 * exactly one of the two, and looks right on both in light mode. Two surfaces and
 * the appearance control below are between them the cheapest way to see it.
 */
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import type { ThemePreference } from '@correctiv/app-core/stores/settings';

import { Hairline, Overline, SafeAreaView, Typo } from '@/components/ui';
import { useCoreActions, useTheme } from '@/lib/store/core';
import { useIsDark } from '@/lib/theme';

import { CATALOGUE, componentId, type Folder, type Specimen } from './catalogue';

const SETTINGS: ThemePreference[] = ['system', 'light', 'dark'];

const COMPONENT_COUNT = CATALOGUE.reduce((n, group) => n + group.entries.length, 0);
const SPECIMEN_COUNT = CATALOGUE.reduce(
  (n, group) => n + group.entries.reduce((m, entry) => m + entry.specimens.length, 0),
  0,
);

/**
 * The appearance setting, and what it currently resolves to.
 *
 * Both are printed, because "System" against a dark device is the app's default
 * and the combination that has already shipped broken: the setting alone does not
 * say which palette is on screen. This writes the app's own setting through the
 * store, so it persists exactly as the settings screen's control does — the
 * gallery is not a sandbox.
 */
function Appearance() {
  const setting = useTheme();
  const isDark = useIsDark();
  const actions = useCoreActions();

  return (
    <View className="mt-s">
      <View className="flex-row gap-2xs">
        {SETTINGS.map((value) => (
          <Pressable
            key={value}
            onPress={() => actions.settings.setTheme(value)}
            accessibilityRole="button"
            accessibilityLabel={`Appearance: ${value}`}
            accessibilityState={{ selected: setting === value }}
            className={[
              'rounded-s px-s py-2xs active:opacity-80',
              setting === value ? 'bg-accent' : 'bg-surface border border-stroke',
            ].join(' ')}
          >
            <Typo variant="text-s" color={setting === value ? 'always-light' : 'on-canvas'}>
              {value}
            </Typo>
          </Pressable>
        ))}
      </View>
      <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs">
        {`setting ${setting}, painting ${isDark ? 'dark' : 'light'}`}
      </Typo>
    </View>
  );
}

/** One specimen on one surface, outlined and named so the surface is never in doubt. */
function Surface({
  surface,
  children,
}: {
  surface: 'canvas' | 'surface';
  children: Specimen['node'];
}) {
  return (
    <View
      className={[
        'mt-2xs rounded-s border border-stroke p-s',
        surface === 'canvas' ? 'bg-canvas' : 'bg-surface',
      ].join(' ')}
    >
      <Typo variant="text-s" color="on-canvas-muted" className="mb-2xs">
        {surface}
      </Typo>
      {children}
    </View>
  );
}

function SpecimenBlock({ specimen }: { specimen: Specimen }) {
  // A component that fills a screen collapses to nothing inside a ScrollView, so
  // it is given a height; everything else is sized by its own content.
  const body = specimen.height ? (
    <View style={{ height: specimen.height }}>{specimen.node}</View>
  ) : (
    specimen.node
  );

  return (
    <View className="mt-ml">
      <Typo variant="text-s" weight="semibold" color="on-canvas-muted">
        {specimen.label}
      </Typo>
      <Surface surface="canvas">{body}</Surface>
      {specimen.ownSurface ? null : <Surface surface="surface">{body}</Surface>}
    </View>
  );
}

/**
 * The two ways out of a filtered view, and the seam this page sits on.
 *
 * The gallery draws the components and the handbook's reference describes them, and
 * for a long time those were two places with no way from one to the other. This is
 * one half of the way; `pages/Components.tsx` is the other.
 *
 * **Back to the reference is web-only, and that is not a shortcut.** The handbook is
 * a website: on the device there is nothing at the other end of that link. Reaching
 * it as `../components` rather than an absolute path is what makes it work in both
 * places it does exist — `/app/gallery` locally resolves to `/components`, and
 * `/correctiv-app/app/gallery` on Pages to `/correctiv-app/components`, without
 * either being written down.
 *
 * It does not resolve on the app's own dev server, which serves the app and not the
 * handbook. That is the one case where this link goes nowhere, and the address bar
 * says why.
 */
function Links({ only }: { only?: string }) {
  if (!only) return null;
  const reference = Platform.OS === 'web' ? `../components#c-${only.replace('/', '-')}` : null;
  return (
    <View className="mt-s flex-row flex-wrap gap-m">
      <Pressable onPress={() => router.setParams({ c: undefined })} className="active:opacity-60">
        <Typo variant="text-s" weight="semibold" color="accent">
          All components
        </Typo>
      </Pressable>
      {reference ? (
        <Pressable
          onPress={() => globalThis.location?.assign(reference)}
          className="active:opacity-60"
        >
          <Typo variant="text-s" weight="semibold" color="accent">
            Its props, in the reference
          </Typo>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The catalogue, or the one component the address asked for.
 *
 * Filtering rather than scrolling to an anchor, because the page this feeds is a
 * frame the width of a phone: an anchor there leaves 100 specimens above and below
 * the one somebody clicked, and the scroll position is the only thing saying which
 * of them was meant.
 *
 * An id nothing matches yields an empty list rather than the whole catalogue. A
 * link that has gone stale should say so, not quietly show everything and look
 * like it worked.
 */
function shown(only: string | undefined): Folder[] {
  if (!only) return CATALOGUE;
  return CATALOGUE.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => componentId(group.folder, entry.name) === only),
  })).filter((group) => group.entries.length > 0);
}

export function Gallery({ only }: { only?: string }) {
  const groups = shown(only);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-3xl"
        showsVerticalScrollIndicator={false}
      >
        <Typo variant="headline-m">{only ?? 'Component gallery'}</Typo>
        <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs">
          {only
            ? groups.length === 0
              ? 'No component of that name. The link that sent you here is out of date.'
              : 'One component of the catalogue. The reference has its props.'
            : `${COMPONENT_COUNT} components from src/components, ${SPECIMEN_COUNT} specimens, grouped by folder. A page for developers, published like any other route.`}
        </Typo>
        <Links only={only} />
        <Appearance />

        {groups.map((group, g) => (
          // The first folder sits under the page's own header, which is already a
          // break; the gap that separates two folders would read as a hole there.
          <View key={group.folder} className={g === 0 ? 'mt-l' : 'mt-4xl'}>
            <Hairline />
            <Overline label={`components/${group.folder}`} color="accent" className="mt-s" />
            {group.entries.map((entry, i) => (
              <View key={entry.name} className={i === 0 ? 'mt-l' : 'mt-4xl'}>
                {/* A rule above every component but the first of its folder. The
                    folder already has one, and two hairlines with nothing between
                    them read as a mistake rather than as a boundary. */}
                {i === 0 ? null : <Hairline className="mb-l" />}
                <Typo variant="headline-s">{entry.name}</Typo>
                {entry.note ? (
                  <Typo variant="text-s" color="on-canvas-muted" className="mt-4xs">
                    {entry.note}
                  </Typo>
                ) : null}
                {entry.specimens.map((specimen) => (
                  <SpecimenBlock key={specimen.label} specimen={specimen} />
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
