import { Switch, View } from 'react-native';

import { Typo } from '@/components/ui';
import { colors } from '@/lib/theme';

/**
 * Eine Einstellungszeile: Beschriftung, Erklärung, Schalter.
 *
 * `Switch` aus react-native und nicht der aus `@expo/ui`: der wäre nativ
 * (SwiftUI/Compose) und fiele auf Web weg — dieselbe Abwägung wie beim
 * Fortschrittsbalken des Players.
 */
export function SettingRow({
  label,
  description,
  value,
  onValueChange,
  className,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <View className={['flex-row items-center py-2xs', className ?? ''].join(' ')}>
      <View className="flex-1 pr-s">
        <Typo variant="text-m">{label}</Typo>
        {description && (
          <Typo variant="text-s" color="grey-500" className="mt-4xs">
            {description}
          </Typo>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: colors['grey-300'], true: colors.emphasis }}
        thumbColor={colors['grey-100']}
      />
    </View>
  );
}
