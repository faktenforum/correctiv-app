import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  /** 'surface' = graue Fläche (grey-200), 'outline' = weiß mit Hairline. Keine Schatten. */
  tone?: 'surface' | 'outline';
  className?: string;
};

export function Card({ tone = 'outline', className, ...rest }: CardProps) {
  const base = tone === 'surface' ? 'bg-grey-200' : 'bg-grey-100 border border-grey-300';
  return <View className={['rounded-md p-m', base, className ?? ''].join(' ')} {...rest} />;
}
