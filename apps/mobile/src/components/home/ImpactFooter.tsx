import { View } from 'react-native';

import { Typo } from '@/components/ui';

/**
 * Home's quiet closing moment.
 *
 * It used to end on "Unterstützer:in werden" and on the sentence that the journalism
 * stays free for everyone. Both addressed someone who had not paid yet, and since the
 * door (ADR 0016) that person is not in the app. What is left is the thank-you, which
 * is the part that was always true here. Removed with ADR 0018.
 */
export function ImpactFooter() {
  return (
    <View className="mt-m items-center rounded-md bg-grey-200 p-l">
      <Typo variant="headline-s" className="text-center">
        Ermöglicht durch Unterstützer:innen wie Sie
      </Typo>
      <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
        CORRECTIV ist gemeinnützig. Ihr Beitrag finanziert die Recherchen, die hier stehen.
      </Typo>
    </View>
  );
}
