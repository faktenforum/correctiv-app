import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  /** 'surface' = tinted fill (`surface`), 'outline' = `canvas` with a `stroke` hairline. No shadows. */
  tone?: 'surface' | 'outline';
  className?: string;
};

export function Card({ tone = 'outline', className, ...rest }: CardProps) {
  const base = tone === 'surface' ? 'bg-surface' : 'bg-canvas border border-stroke';
  return <View className={['rounded-md p-m', base, className ?? ''].join(' ')} {...rest} />;
}
