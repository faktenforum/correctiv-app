import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';

/** Home's quiet closing moment: thanks plus a calm CTA, never a barrier. */
export function ImpactFooter({ onJoin }: { onJoin?: () => void }) {
  return (
    <View className="mt-m items-center rounded-md bg-grey-200 p-l">
      <Typo variant="headline-s" className="text-center">
        Ermöglicht durch Unterstützer:innen wie Sie
      </Typo>
      <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
        CORRECTIV ist gemeinnützig und spendenfinanziert. Unser Journalismus bleibt frei – für alle.
      </Typo>
      <Pressable onPress={onJoin} hitSlop={8} className="mt-s active:opacity-60">
        <Typo variant="button" color="emphasis">
          Unterstützer:in werden →
        </Typo>
      </Pressable>
    </View>
  );
}
