import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import { colors } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Zeile mit Icon, Titel, Erklärung und Chevron — im Profil gibt es fünf davon
 * (Bericht, Backstage, Gespeichert, Einstellungen …). Hairline-getrennt wie das
 * Verzeichnis auf Entdecken, damit die App eine Listensprache hat und nicht zwei.
 */
export function NavCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={title}
      className="flex-row items-center border-b border-grey-300 py-s active:opacity-70"
    >
      <Ionicons name={icon} size={20} color={colors['grey-600']} />
      <View className="ml-s flex-1">
        <Typo variant="text-m" weight="bold">
          {title}
        </Typo>
        <Typo variant="text-s" color="grey-600" className="mt-4xs">
          {subtitle}
        </Typo>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors['grey-500']} />
    </Pressable>
  );
}
