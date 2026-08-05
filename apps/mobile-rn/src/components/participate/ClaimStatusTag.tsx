import { View } from 'react-native';

import { Typo } from '@/components/ui';
import { claimStatusTag, type Claim } from '@correctiv/app-core/data/claims';
import { colors } from '@/lib/theme';

/**
 * Prüfstatus einer Behauptung. Die Beschriftung kommt aus dem Core
 * (`claimStatusTag`), damit Liste und Detailseite nie auseinanderlaufen; die
 * Farben stehen hier, weil der Core keine Plattform-Styles kennt.
 *
 * „Richtig" ist die eine Stelle, an der die Marken-Palette nicht reicht: ein
 * bestätigter Faktencheck darf nicht dasselbe Rot tragen wie ein widerlegter.
 * Der NativeScript-Stand hat dafür ein Grün eingeführt (#2e7d4f) — dasselbe hier,
 * mit derselben Begründung und ohne es zum Token zu erklären.
 */
const CHECKED_TRUE_GREEN = '#2e7d4f';

function toneFor(claim: Claim): { background: string; color: string; border?: string } {
  if (claim.status === 'checked') {
    return claim.rating === 'richtig'
      ? { background: CHECKED_TRUE_GREEN, color: colors['grey-100'] }
      : { background: colors.emphasis, color: colors['grey-100'] };
  }
  if (claim.status === 'checking') {
    return {
      background: colors['grey-100'],
      color: colors['grey-700'],
      border: colors['grey-400'],
    };
  }
  return { background: colors['grey-250'], color: colors['grey-600'] };
}

export function ClaimStatusTag({ claim, className }: { claim: Claim; className?: string }) {
  const tone = toneFor(claim);
  return (
    <View
      className={['self-start rounded-xs px-2xs py-4xs', className ?? ''].join(' ')}
      style={{
        backgroundColor: tone.background,
        borderWidth: tone.border ? 1 : 0,
        borderColor: tone.border,
      }}
    >
      <Typo variant="text-s" weight="bold" style={{ fontSize: 11, color: tone.color }}>
        {claimStatusTag(claim).text}
      </Typo>
    </View>
  );
}
