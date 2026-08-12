import { View } from 'react-native';

import { Typo } from '@/components/ui';
import { claimStatusTag, type Claim } from '@correctiv/app-core/data/claims';
import { useColors, type Palette } from '@/lib/theme';

/**
 * The checking status of a claim. The wording comes from the core
 * (`claimStatusTag`), so that the list and the detail page can never drift apart;
 * the colours live here, because the core knows no platform styles.
 *
 * "Richtig" is the one place the brand palette does not stretch to: a confirmed
 * fact check must not wear the same red as a refuted one. The NativeScript build
 * introduced a green for it (#2e7d4f) — the same one here, for the same reason, and
 * still not declared a token.
 */
const CHECKED_TRUE_GREEN = '#2e7d4f';

function toneFor(
  claim: Claim,
  colors: Palette,
): { background: string; color: string; border?: string } {
  // The two coloured states carry their label on a surface that is the same in
  // both schemes; the two neutral ones sit on the card.
  if (claim.status === 'checked') {
    return claim.rating === 'richtig'
      ? { background: CHECKED_TRUE_GREEN, color: colors['always-light'] }
      : { background: colors.emphasis, color: colors['always-light'] };
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
  const colors = useColors();
  const tone = toneFor(claim, colors);
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
