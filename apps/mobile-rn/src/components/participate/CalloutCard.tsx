import { View } from 'react-native';

import { Button, Card, Overline, Typo } from '@/components/ui';
import type { Callout } from '@correctiv/app-core/data/callouts';
import { formatNumberDe } from '@correctiv/app-core/lib/format';
import { useExtraCount, useHasSubmitted } from '@/lib/store/core';

/**
 * Willkürliches Ziel für die Fortschrittsanzeige — es gibt keine Zielzahl in den
 * Daten, und der Balken soll trotzdem Bewegung zeigen. Übernommen vom
 * NativeScript-Stand, damit dieselbe Aktion nicht plötzlich anders gefüllt aussieht.
 */
const GOAL = 3000;

/**
 * Ein aktiver Aufruf in der Übersicht. Der Zähler ist die Demo-Magie: eigene
 * Einreichungen erhöhen ihn sofort und dauerhaft (persistiert im Core-Store), der
 * Balken wächst mit.
 *
 * Nur der Knopf ist tippbar, nicht die ganze Karte — ein Knopf IN einer tippbaren
 * Karte wären zwei Ziele für dieselbe Aktion, und die Beschriftung trägt die
 * Bedeutung ohnehin (so auch im Designentwurf).
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

  return (
    <Card className="mb-s">
      <Overline label="CrowdNewsroom" color="emphasis" />
      <Typo variant="headline-xs" className="mt-2xs">
        {callout.title}
      </Typo>
      <Typo variant="text-s" color="grey-600" numberOfLines={2} className="mt-2xs">
        {callout.excerpt}
      </Typo>

      <View className="mt-s overflow-hidden rounded-s bg-grey-250" style={{ height: 4 }}>
        <View className="h-full bg-grey-700" style={{ width: `${percent}%` }} />
      </View>
      <Typo variant="text-s" color="grey-500" className="mt-3xs">
        {formatNumberDe(total)} Beiträge
      </Typo>

      {submitted && (
        <Typo variant="text-s" color="emphasis" className="mt-2xs">
          ✓ Sie haben beigetragen
        </Typo>
      )}

      <Button
        title={submitted ? 'Weiteren Hinweis geben' : 'Mitmachen'}
        variant={submitted ? 'outline' : 'primary'}
        onPress={() => onPress(callout)}
        className="mt-s"
      />
    </Card>
  );
}
