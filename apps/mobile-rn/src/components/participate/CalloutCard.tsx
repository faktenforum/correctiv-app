import { View } from 'react-native';

import { Button, Card, Overline, Typo } from '@/components/ui';
import type { Callout } from '@correctiv/app-core/data/callouts';
import { formatNumberDe } from '@correctiv/app-core/lib/format';
import { calloutStyle } from '@/lib/participate/calloutStyle';
import { useExtraCount, useHasSubmitted } from '@/lib/store/core';
import { sizes } from '@/lib/theme';

/**
 * An arbitrary target for the progress bar. The data carries no goal figure and the
 * bar should still show movement. The number is fixed rather than derived so the
 * same callout does not suddenly look differently filled.
 */
const GOAL = 3000;

/**
 * An open callout in the overview. The counter is the demo's magic: your own
 * submission raises it at once and for good (persisted in the core store), and the
 * bar grows with it.
 *
 * Only the button is tappable, not the whole card — a button inside a tappable card
 * would be two targets for one action, and the label carries the meaning anyway
 * (the draft does it the same way).
 */
export function CalloutCard({
  callout,
  onPress,
}: {
  callout: Callout;
  onPress: (callout: Callout) => void;
}) {
  const extra = useExtraCount(callout.slug);
  const submitted = useHasSubmitted(callout.slug);
  const total = callout.responseCount + extra;
  const percent = Math.min(95, Math.max(8, Math.round((total / GOAL) * 100)));
  const style = calloutStyle(callout);

  return (
    <Card className="mb-s">
      <Overline label={style.kicker} color="emphasis" />
      <Typo variant="headline-xs" className="mt-2xs">
        {callout.title}
      </Typo>
      <Typo variant="text-s" color="grey-600" numberOfLines={2} className="mt-2xs">
        {callout.excerpt}
      </Typo>

      <View
        className="mt-s overflow-hidden rounded-s bg-grey-250"
        style={{ height: sizes.progressBar }}
      >
        <View className="h-full bg-grey-700" style={{ width: `${percent}%` }} />
      </View>
      <Typo variant="text-s" color="grey-500" className="mt-3xs">
        {formatNumberDe(total)} {style.unit}
      </Typo>

      {submitted && (
        <Typo variant="text-s" color="emphasis" className="mt-2xs">
          ✓ Sie haben beigetragen
        </Typo>
      )}

      <Button
        title={submitted ? 'Weiteren Hinweis geben' : style.cta}
        variant={submitted ? 'outline' : style.variant}
        onPress={() => onPress(callout)}
        className="mt-s"
      />
    </Card>
  );
}
