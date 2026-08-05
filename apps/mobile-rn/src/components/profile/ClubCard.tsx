import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Button, Card, Overline, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { colors } from '@/lib/theme';

/**
 * Der Kopf des Profils — gelbe Clubkarte für Mitglieder, Gastkarte für alle
 * anderen. Beide Zustände sind Einladung, keine Schranke: der Gasttext sagt
 * ausdrücklich, dass alles Wichtige frei bleibt.
 */
export function ClubCard({
  isMember,
  name,
  memberSince,
  onJoin,
}: {
  isMember: boolean;
  name: string;
  memberSince: string | null;
  onJoin: () => void;
}) {
  if (!isMember) {
    return (
      <Card className="mt-s">
        <Typo variant="headline-xs">Sie sind als Gast unterwegs</Typo>
        <Typo variant="text-s" color="grey-600" className="mt-2xs">
          Alles Wichtige bleibt frei zugänglich. Der Club bringt Sie näher ran: früher lesen,
          Backstage, Bonusfolgen.
        </Typo>
        <Button title="Unterstützer:in werden" onPress={onJoin} className="mt-s" />
      </Card>
    );
  }

  return (
    <View className="mt-s rounded-md bg-alternative p-m">
      <View className="flex-row items-center justify-between">
        <Overline label="CORRECTIV Club" color="grey-700" />
        <Ionicons name="heart" size={20} color={colors['grey-700']} />
      </View>
      <Typo variant="headline-l" className="mt-m">
        {name || 'Clubmitglied'}
      </Typo>
      {memberSince && (
        <Typo variant="text-s" color="grey-600">
          Mitglied seit {formatDateShortDe(memberSince)}
        </Typo>
      )}
    </View>
  );
}
