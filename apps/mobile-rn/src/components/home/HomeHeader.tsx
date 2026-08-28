import { View } from 'react-native';

import { Hairline, Typo } from '@/components/ui';
import { formatDateWeekdayDe } from '@correctiv/app-core/lib/format';

/**
 * Home's masthead: wordmark left, today's date right, hairline below.
 *
 * The date is what makes the screen read as today's edition instead of a static
 * list. The design draft carries it, and the core has had `formatDateWeekdayDe`
 * ("Freitag, 12. Juni 2026") waiting for this one spot. It replaces the fixed
 * tagline, which said the same thing on every launch.
 */
export function HomeHeader() {
  return (
    <View className="mb-m">
      <View className="flex-row items-center justify-between">
        <Typo variant="text-m" weight="bold" style={{ letterSpacing: 1.5 }}>
          CORRECTIV
        </Typo>
        <Typo variant="text-s" color="grey-600">
          {formatDateWeekdayDe(new Date())}
        </Typo>
      </View>
      <Hairline className="mt-s" />
    </View>
  );
}
