import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hairline } from './Hairline';
import { Typo } from './Typo';
import { goBack } from '@/lib/navigation/goBack';
import { colors } from '@/lib/theme';

export type ScreenHeaderProps = {
  /**
   * What back means. Left out: one step back, and home when there is no step back
   * — a deep link or a shared web address. Every screen used to pass its own
   * `router.back()`, and not one of them knew about that case; see
   * `lib/navigation/goBack.ts`.
   */
  onBack?: () => void;
  /**
   * Label of the back control. "Abbrechen" in the form, where a second "Zurück"
   * button steps within the form — two identically named buttons meaning
   * different things would be a trap.
   */
  backLabel?: string;
  /**
   * Sits right of the back control (the search field on /suche). When something is
   * set, back shrinks to the chevron alone — otherwise the row does not fit.
   */
  children?: ReactNode;
};

/**
 * Back bar with a hairline, as in the design draft: chevron plus "Zurück", no
 * title row. Deliberately NOT a native stack header — the app sets
 * `headerShown: false` throughout and builds its own bars, so that iOS, Android
 * and web show the same brand. A native header looks different on every platform,
 * and on web it does not appear at all.
 */
export function ScreenHeader({ onBack, backLabel = 'Zurück', children }: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={['top']} className="bg-grey-100">
      <View className="flex-row items-center px-s py-2xs">
        <Pressable
          onPress={onBack ?? goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          className="flex-row items-center py-2xs active:opacity-60"
        >
          <Ionicons name="chevron-back" size={20} color={colors['grey-700']} />
          {!children && (
            <Typo variant="text-m" weight="semibold" className="ml-4xs">
              {backLabel}
            </Typo>
          )}
        </Pressable>
        {children && <View className="ml-2xs flex-1">{children}</View>}
      </View>
      <Hairline />
    </SafeAreaView>
  );
}
