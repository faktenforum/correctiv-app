import { router } from 'expo-router';
import { View } from 'react-native';

import { CalloutCard } from '@/components/participate/CalloutCard';
import { Button, Card, Overline, Screen, Typo } from '@/components/ui';
import { callouts, type Callout } from '@correctiv/app-core/data/callouts';
import { atlasStats } from '@correctiv/app-core/data/abriss-atlas';
import { claims } from '@correctiv/app-core/data/claims';
import { formatNumberDe } from '@correctiv/app-core/lib/format';
import { openExternal } from '@/lib/openExternal';

/** The fact-check desk's public tip line. */
const WHATSAPP_TIP = 'https://wa.me/4915142647500';

/**
 * Mitmachen — the four ways in: CrowdNewsroom callouts, the Faktenforum, the
 * demolition atlas, and a tip by WhatsApp.
 *
 * Laid out after the design draft: one group label and one card with exactly one
 * button per area. A card rather than the icon row an earlier design used: it
 * carries the explanation better, and with four areas the space is worth it.
 */
export default function MitmachenScreen() {
  return (
    <Screen>
      <Typo variant="headline-xl">Mitmachen</Typo>
      <Typo variant="text-m" color="on-canvas-muted" className="mt-2xs">
        Recherchen entstehen mit Ihnen. Ihre Hinweise, Beobachtungen und Prüfungen machen sie erst
        möglich.
      </Typo>

      <View className="mt-l">
        <Overline label="Aktive Aufrufe" />
        <View className="mt-2xs">
          {callouts.map((callout) => (
            <CalloutCard key={callout.slug} callout={callout} onPress={openCallout} />
          ))}
        </View>
      </View>

      <View className="mt-m">
        <Overline label="Faktenforum" />
        <Card tone="surface" className="mt-2xs">
          <Typo variant="headline-xs">Behauptungen gemeinsam prüfen</Typo>
          <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs">
            Die Community prüft Behauptungen aus dem Netz, angeleitet von der Redaktion. Gerade sind{' '}
            {claims.length} Behauptungen in Arbeit.
          </Typo>
          <Button
            title="Behauptungen ansehen"
            variant="outline"
            onPress={() => router.push('/faktenforum')}
            className="mt-s"
          />
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Abriss-Atlas" />
        <Card className="mt-2xs">
          <Typo variant="headline-xs">Abrisse dokumentieren</Typo>
          <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs">
            Welche Gebäude verschwinden? {formatNumberDe(atlasStats.totalReports)} Meldungen aus{' '}
            {atlasStats.citiesCovered} Städten in Deutschland und der Schweiz.
          </Typo>
          <Button
            title="Atlas ansehen"
            variant="outline"
            onPress={() => router.push('/atlas')}
            className="mt-s"
          />
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Tipp geben" />
        <Card tone="surface" className="mt-2xs">
          <Typo variant="headline-xs">Faktencheck-Tipp per WhatsApp</Typo>
          <Typo variant="text-s" color="on-canvas-muted" className="mt-2xs">
            Verdächtige Behauptung gesehen? Schicken Sie sie direkt der Faktencheck-Redaktion.
          </Typo>
          <Button
            title="WhatsApp öffnen"
            variant="outline"
            onPress={() => openExternal(WHATSAPP_TIP)}
            className="mt-s"
          />
        </Card>
      </View>

      <Typo variant="text-s" color="grey-500" className="mt-l">
        Im Community-Bereich diskutieren Sie Recherchen mit anderen Mitgliedern, bald auch in der
        App.
      </Typo>
    </Screen>
  );
}

function openCallout(callout: Callout) {
  router.push({ pathname: '/aufruf/[slug]', params: { slug: callout.slug } });
}
