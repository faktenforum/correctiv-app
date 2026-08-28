import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  /** 'surface' = tinted fill (grey-200), 'outline' = page surface with a hairline. No shadows. */
  tone?: 'surface' | 'outline';
  className?: string;
};

export function Card({ tone = 'outline', className, ...rest }: CardProps) {
  const base = tone === 'surface' ? 'bg-grey-200' : 'bg-grey-100 border border-grey-300';
  return <View className={['rounded-md p-m', base, className ?? ''].join(' ')} {...rest} />;
}
