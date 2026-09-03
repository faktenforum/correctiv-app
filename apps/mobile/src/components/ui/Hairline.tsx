import { View } from 'react-native';

/** 1px divider in `stroke` — the design system draws boundaries with lines, not shadows. */
export function Hairline({ className }: { className?: string }) {
  return <View className={['bg-stroke', className ?? ''].join(' ')} style={{ height: 1 }} />;
}
