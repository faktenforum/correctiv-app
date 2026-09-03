import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { useColors } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Row with an icon, a title, an explanation and a chevron — the profile has five
 * of them (report, backstage, saved, settings …). Separated by hairlines like the
 * directory on Entdecken, so the app speaks one list language and not two.
 *
 * `club` marks what membership brings, in the club's yellow. The draft carries that
 * badge on every entry the membership brings. It marks what a contribution pays
 * for; it has never withheld anything, and since ADR 0018 there is nobody here it
 * could withhold from.
 */
export function NavCard({
  icon,
  title,
  subtitle,
  club = false,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  club?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={club ? `${title}, Club` : title}
      className="flex-row items-center border-b border-stroke py-s active:opacity-70"
    >
      <Ionicons name={icon} size={20} color={colors['on-canvas-muted']} />
      <View className="ml-s flex-1">
        <View className="flex-row items-center">
          <Typo variant="text-m" weight="bold">
            {title}
          </Typo>
          {club && <Badge label="Club" tone="club" className="ml-2xs" />}
        </View>
        <Typo variant="text-s" color="on-canvas-muted" className="mt-4xs">
          {subtitle}
        </Typo>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors['grey-500']} />
    </Pressable>
  );
}
