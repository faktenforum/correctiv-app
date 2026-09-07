import { View, Text } from 'react-native';

import { typography, useColors, type ColorToken } from '@/lib/theme';

type Tone = 'emphasis' | 'club' | 'neutral' | 'live';

export type BadgeProps = {
  label: string;
  /** emphasis = Projekt-Badge (rot), club = Backstage (gelb), live = roter Punkt + Label. */
  tone?: Tone;
  className?: string;
};

const SURFACE: Record<Tone, string> = {
  emphasis: 'bg-accent',
  club: 'bg-accent-alternative',
  neutral: 'bg-grey-250',
  live: 'bg-transparent',
};
// The two coloured surfaces carry role colours, which are the same in both
// schemes; the two neutral tones sit on the page surface and change with it.
const TEXT_COLOR: Record<Tone, ColorToken> = {
  emphasis: 'always-light',
  club: 'always-dark',
  neutral: 'on-canvas-muted',
  live: 'accent',
};

/**
 * A small label (project / fact check / backstage). Radius s, no shadows.
 *
 * `numberOfLines` is one for the reason spelled out in `Overline`: a letter-spaced
 * label with a space in it wraps at its own natural width on GTK, and the second
 * line is clipped. A pill is one line in the design either way.
 */
export function Badge({ label, tone = 'emphasis', className }: BadgeProps) {
  const colors = useColors();
  return (
    <View
      className={[
        'flex-row items-center self-start rounded-s px-2xs py-4xs',
        SURFACE[tone],
        className ?? '',
      ].join(' ')}
    >
      {tone === 'live' && (
        <View className="mr-3xs rounded-full bg-accent" style={{ width: 7, height: 7 }} />
      )}
      <Text
        numberOfLines={1}
        style={[
          typography['text-s'],
          {
            color: colors[TEXT_COLOR[tone]],
            fontSize: 11,
            letterSpacing: 0.4,
            flexShrink: 0,
            textTransform: 'uppercase',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
