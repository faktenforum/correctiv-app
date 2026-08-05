import { View } from 'react-native';

/** 1px-Trennlinie in grey-300 — ersetzt Schatten als Begrenzung (Designvorgabe). */
export function Hairline({ className }: { className?: string }) {
  return <View className={['bg-grey-300', className ?? ''].join(' ')} style={{ height: 1 }} />;
}
