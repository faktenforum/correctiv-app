import type { ReactNode } from 'react';
import { View } from 'react-native';

import { spacingPx } from '@/lib/theme';

/**
 * Escapes the screen's horizontal padding, for images that run edge to edge.
 *
 * Same reasoning as `Rail`: the number is the screen's own `px-m`, so it comes
 * from the token rather than being typed as a bare 24 at each call site, and a
 * change to the screen padding cannot leave a hero behind.
 */
export function Bleed({ children }: { children: ReactNode }) {
  return <View style={{ marginHorizontal: -spacingPx.m }}>{children}</View>;
}
