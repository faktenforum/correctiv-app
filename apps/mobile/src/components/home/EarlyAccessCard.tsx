import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';

/**
 * Early-access card (SAMPLE data).
 *
 * It used to carry two copies, an invitation for guests and "Jetzt lesen" for
 * members, and Home never passed the flag, so members saw the guest copy. Since the
 * door (ADR 0016) everyone here is a member, so there is one copy and the bug it
 * carried is gone with the branch. Removed with ADR 0018.
 */
export function EarlyAccessCard({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-md border border-grey-300 active:opacity-90"
    >
      <View className="bg-alternative px-m py-s">
        <Badge label="Backstage · Früher lesen" tone="club" />
      </View>
      <View className="p-m">
        <Typo variant="headline-s">Die Pensionskassen-Recherche, exklusiv vorab</Typo>
        <Typo variant="text-m" color="grey-600" className="mt-2xs">
          Sie lesen jetzt, drei Tage vor allen anderen.
        </Typo>
        <Typo variant="button" color="emphasis" className="mt-s">
          Jetzt lesen →
        </Typo>
      </View>
    </Pressable>
  );
}
