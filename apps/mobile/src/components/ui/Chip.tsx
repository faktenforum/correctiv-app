import { Pressable, Text } from 'react-native';

import { typography, useColors } from '@/lib/theme';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

/** Selection chip (onboarding interests, discover topics). Active = red fill. */
export function Chip({ label, selected = false, onPress, className }: ChipProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      // Explicit, like Button: the label is otherwise only read off the child Text,
      // and it gives a test a stable handle on one chip among many.
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={[
        'rounded-md px-s py-2xs active:opacity-80',
        selected ? 'bg-accent' : 'bg-surface border border-stroke',
        className ?? '',
      ].join(' ')}
    >
      <Text
        style={[
          typography['text-s'],
          {
            // Selected, the label sits on the brand surface; otherwise on the page.
            color: selected ? colors['always-light'] : colors['on-canvas'],
            fontFamily: 'SourceSans3_600SemiBold',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
