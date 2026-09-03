import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Overline, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { colors } from '@/lib/theme';

/**
 * The head of the profile.
 *
 * There used to be a second state here, a guest card offering to join. It had an
 * audience while the app was open to everyone. Since the door (ADR 0016) everyone
 * inside has an entitlement that includes the app, so the guest branch addressed
 * nobody and said the opposite of what the door had just said. Removed with ADR 0018.
 *
 * The card stays yellow in both schemes, because the yellow carries meaning.
 * Everything on it therefore takes the fixed dark role colour rather than the page's
 * text colour, which turns near-white in dark mode and would vanish on the yellow.
 */
export function ClubCard({
  name,
  tierLabel,
  memberSince,
}: {
  name: string;
  tierLabel: string;
  memberSince: string | null;
}) {
  return (
    <View className="mt-s rounded-md bg-accent-alternative p-m">
      <View className="flex-row items-center justify-between">
        <Overline label="CORRECTIV Club" color="always-dark" />
        <Ionicons name="heart" size={20} color={colors['always-dark']} />
      </View>
      <Typo variant="headline-l" color="always-dark" className="mt-m">
        {name || 'Mitglied'}
      </Typo>
      {/* Not `on-canvas-muted`: club yellow does not follow the scheme, so the
          secondary line is dimmed rather than recoloured — otherwise every fixed
          surface would need a foreground scale of its own. */}
      <Typo variant="text-s" color="always-dark" className="opacity-70">
        {memberSince ? `${tierLabel} · seit ${formatDateShortDe(memberSince)}` : tierLabel}
      </Typo>
    </View>
  );
}
