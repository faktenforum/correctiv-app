import { Pressable, Text, type PressableProps } from 'react-native';

import { typography, colors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'club';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
};

// Marken-Logik: Rot (emphasis) für den Journalismus-CTA, Gelb (alternative) für
// den Club. Keine Schatten — Form über Flächen + Radius md (5px).
const SURFACE: Record<Variant, string> = {
  primary: 'bg-emphasis',
  secondary: 'bg-grey-200',
  outline: 'bg-grey-100 border border-grey-300',
  club: 'bg-alternative',
};
const LABEL_COLOR: Record<Variant, string> = {
  primary: colors['grey-100'],
  secondary: colors['grey-700'],
  outline: colors['grey-700'],
  club: colors['grey-700'],
};

export function Button({ title, variant = 'primary', fullWidth, className, disabled, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={[
        'rounded-md px-m py-s items-center justify-center active:opacity-80',
        SURFACE[variant],
        fullWidth ? 'self-stretch' : 'self-start',
        disabled ? 'opacity-40' : '',
        className ?? '',
      ].join(' ')}
      {...rest}>
      <Text style={[typography.button, { color: LABEL_COLOR[variant] }]}>{title}</Text>
    </Pressable>
  );
}
