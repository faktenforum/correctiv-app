import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import type { SearchSample } from '@correctiv/app-core/data/search-samples';
import { colors } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ICON: Record<SearchSample['kind'], IoniconName> = {
  podcast: 'headset-outline',
  callout: 'megaphone-outline',
  backstage: 'sparkles-outline',
  verlag: 'book-outline',
  projekt: 'compass-outline',
};

/** Die Tabs, in die ein Treffer springen kann. */
type TabPath = '/(tabs)/mediathek' | '/(tabs)/mitmachen' | '/(tabs)/profil';

/**
 * Wohin ein Nicht-Artikel-Treffer führt — oder `null`, wenn er in dieser App
 * keinen Ort hat.
 *
 * Bücher (`verlag`) haben keinen Bildschirm; im NativeScript-Stand waren sie
 * trotzdem tippbar und taten dann nichts. Hier bleiben sie bewusst inert:
 * lieber sichtbar unantastbar als scheinbar kaputt.
 */
export function sampleTarget(kind: SearchSample['kind']): TabPath | null {
  switch (kind) {
    case 'podcast':
      return '/(tabs)/mediathek';
    case 'callout':
      return '/(tabs)/mitmachen';
    case 'backstage':
      return '/(tabs)/profil';
    default:
      return null;
  }
}

/**
 * Suchtreffer aus den Projekten (Podcasts, Aufrufe, Backstage, Verlag) — der
 * Bestand, der nicht in den RSS-Feeds steht. Icon plus zwei Zeilen.
 */
export function SampleHitRow({ hit, onPress }: { hit: SearchSample; onPress?: () => void }) {
  const row = (
    <View className="flex-row items-center border-b border-grey-300 py-s">
      <Ionicons name={ICON[hit.kind]} size={20} color={colors['grey-600']} />
      <View className="ml-s flex-1">
        <Typo variant="text-m" weight="bold" numberOfLines={2}>
          {hit.title}
        </Typo>
        <Typo variant="text-s" color="grey-500" className="mt-4xs">
          {hit.subtitle}
        </Typo>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors['grey-500']} />}
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" className="active:opacity-70">
      {row}
    </Pressable>
  );
}
