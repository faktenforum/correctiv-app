import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Button, Card, Overline, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { colors } from '@/lib/theme';

/**
 * The head of the profile — a yellow club card for members, a guest card for
 * everyone else. Both states are an invitation, not a barrier: the guest copy says
 * outright that everything that matters stays free.
 *
 * The club card stays yellow in both schemes, because the yellow carries meaning.
 * Everything on it therefore takes the fixed dark role colour rather than the page's
 * text colour, which turns near-white in dark mode and would vanish on the yellow.
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
        <Overline label="CORRECTIV Club" color="always-dark" />
        <Ionicons name="heart" size={20} color={colors['always-dark']} />
      </View>
      <Typo variant="headline-l" color="always-dark" className="mt-m">
        {name || 'Clubmitglied'}
      </Typo>
      {memberSince && (
        // Not grey-600: on the yellow the secondary line is dimmed rather than
        // recoloured, or every fixed surface would need a grey scale of its own.
        <Typo variant="text-s" color="always-dark" className="opacity-70">
          Mitglied seit {formatDateShortDe(memberSince)}
        </Typo>
      )}
    </View>
  );
}
