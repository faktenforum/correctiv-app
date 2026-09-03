import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { bonusMedia, diaries } from '@correctiv/app-core/data/backstage';
import { useColors } from '@/lib/theme';

/**
 * Backstage on Home: the latest research diary, with the bonus episode named
 * underneath.
 *
 * Yellow is the club's colour throughout the design system, and the card stays
 * readable for everyone — the diary is open, the bonus is the member's part. That
 * is the whole argument of the app in one card, which is why the design draft puts
 * it on Home rather than hiding it behind the profile.
 */
export function BackstageTeaser({
  onOpenDiary,
  onOpenBackstage,
}: {
  onOpenDiary: (id: string) => void;
  onOpenBackstage: () => void;
}) {
  const colors = useColors();
  const diary = diaries[0];
  const bonus = bonusMedia[0];

  return (
    <View className="overflow-hidden rounded-md border border-accent-alternative">
      <Pressable
        onPress={() => onOpenDiary(diary.id)}
        accessibilityRole="link"
        accessibilityLabel={diary.title}
        className="p-m active:opacity-90"
      >
        <Badge label="Backstage" tone="club" />
        <Typo variant="headline-s" className="mt-2xs">
          {diary.title}
        </Typo>
        <Typo variant="text-m" color="on-canvas-muted" className="mt-2xs" numberOfLines={2}>
          {diary.teaser}
        </Typo>
      </Pressable>

      {bonus && (
        <View className="mx-m mb-m flex-row items-center rounded-md bg-surface p-s">
          <Ionicons name="headset-outline" size={20} color={colors['on-canvas-muted']} />
          <Typo variant="text-s" weight="semibold" className="ml-s flex-1" numberOfLines={2}>
            {bonus.title}
          </Typo>
        </View>
      )}

      <Pressable
        onPress={onOpenBackstage}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Alles aus dem Backstage"
        className="mx-m mb-m active:opacity-60"
      >
        <Typo variant="button" color="accent">
          Alles aus dem Backstage →
        </Typo>
      </Pressable>
    </View>
  );
}
