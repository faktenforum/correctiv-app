import { View, Text } from 'react-native';

import { typography, colors } from '@/lib/theme';

type Tone = 'emphasis' | 'club' | 'neutral' | 'live';

export type BadgeProps = {
  label: string;
  /** emphasis = Projekt-Badge (rot), club = Backstage (gelb), live = roter Punkt + Label. */
  tone?: Tone;
  className?: string;
};

const SURFACE: Record<Tone, string> = {
  emphasis: 'bg-emphasis',
  club: 'bg-alternative',
  neutral: 'bg-grey-250',
  live: 'bg-transparent',
};
const TEXT_COLOR: Record<Tone, string> = {
  emphasis: colors['grey-100'],
  club: colors['grey-700'],
  neutral: colors['grey-600'],
  live: colors.emphasis,
};

/** Kleines Label (Projekt/Faktencheck/Backstage). Radius s, keine Schatten. */
export function Badge({ label, tone = 'emphasis', className }: BadgeProps) {
  return (
    <View
      className={[
        'flex-row items-center self-start rounded-s px-2xs py-4xs',
        SURFACE[tone],
        className ?? '',
      ].join(' ')}
    >
      {tone === 'live' && (
        <View className="mr-3xs rounded-full bg-emphasis" style={{ width: 7, height: 7 }} />
      )}
      <Text
        style={[
          typography['text-s'],
          { color: TEXT_COLOR[tone], fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
