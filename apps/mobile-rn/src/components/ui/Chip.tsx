import { Pressable, Text } from 'react-native';

import { typography, colors } from '@/lib/theme';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

/** Auswahl-Chip (Onboarding-Interessen, Entdecken-Themen). Aktiv = rote Fläche. */
export function Chip({ label, selected = false, onPress, className }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={[
        'rounded-md px-s py-2xs active:opacity-80',
        selected ? 'bg-emphasis' : 'bg-grey-200 border border-grey-300',
        className ?? '',
      ].join(' ')}>
      <Text
        style={[
          typography['text-s'],
          { color: selected ? colors['grey-100'] : colors['grey-700'], fontFamily: 'SourceSans3_600SemiBold' },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}
