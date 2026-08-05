import { View } from 'react-native';

/** 1px divider in grey-300 — the design system draws boundaries with lines, not shadows. */
export function Hairline({ className }: { className?: string }) {
  return <View className={['bg-grey-300', className ?? ''].join(' ')} style={{ height: 1 }} />;
}
