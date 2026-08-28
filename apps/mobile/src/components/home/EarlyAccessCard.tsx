import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';

/**
 * Early-access card (SAMPLE data). A countdown and an invitation for guests, "Jetzt
 * lesen" for members — the app-wide status flip after joining (M5).
 */
export function EarlyAccessCard({
  isMember = false,
  onPress,
}: {
  isMember?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-md border border-grey-300 active:opacity-90"
    >
      <View className="bg-alternative px-m py-s">
        <Badge label="Backstage · Früher lesen" tone="club" />
      </View>
      <View className="p-m">
        <Typo variant="headline-s">Die Pensionskassen-Recherche – exklusiv vorab</Typo>
        <Typo variant="text-m" color="grey-600" className="mt-2xs">
          {isMember
            ? 'Als Clubmitglied lesen Sie jetzt, drei Tage vor allen anderen.'
            : 'Für alle ab Montag. Clubmitglieder lesen jetzt.'}
        </Typo>
        <Typo variant="button" color="emphasis" className="mt-s">
          {isMember ? 'Jetzt lesen →' : 'Unterstützer:in werden →'}
        </Typo>
      </View>
    </Pressable>
  );
}
