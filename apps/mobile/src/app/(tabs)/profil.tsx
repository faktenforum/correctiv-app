import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ClubCard } from '@/components/profile/ClubCard';
import { NavCard } from '@/components/profile/NavCard';
import { SettingRow } from '@/components/profile/SettingRow';
import { Button, Card, Hairline, Overline, Screen, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import type { Entitlement } from '@correctiv/app-core/types/models';
import { quarterlyReport } from '@correctiv/app-core/data/quartalsbericht';
import { isFactCheckUrl } from '@/lib/articles/articleUrl';
import { useFeed } from '@/lib/feeds/useFeed';
import { TIER_LABELS } from '@/lib/membership/tierLabel';
import { openArticle } from '@/lib/openArticle';
import { openExternal } from '@/lib/openExternal';
import { useCoreActions, useSavedArticles, useSession, useSettings } from '@/lib/store/core';

/**
 * Where "Konto verwalten" goes, and why it is a constant rather than a literal.
 *
 * The address is provisional. beabee will own the account page and does not have one
 * yet, so this points at the only page the app knows. What the link may SAY, and how
 * it may LOOK, is the part with rules behind it: outside the US a link to one's own
 * site needs Apple's External Link Account Entitlement, which permits managing an
 * account, forbids naming a price, and wants the link formatted as a plain text link
 * that names the domain, shown behind Apple's own interstitial sheet. So the label is
 * "Konto verwalten" and never "Beitrag erhöhen"; the button form and the missing sheet
 * are open together with the address, and ADR 0020 records all three. Separate from
 * the door's own link, which is an upgrade offer to somebody who has no access, so
 * that the two can be decided apart.
 */
const ACCOUNT_URL = 'https://correctiv.org/unterstuetzen/';

/** Why the app is open, in the reader's words. Mirrors `EntitlementSource`. */
const SOURCE_LABELS: Record<NonNullable<Entitlement['source']>, string> = {
  paid: 'Ihren Beitrag',
  'local-bundle': 'Ihr Lokal-Abo',
  trial: 'Ihre Testphase',
};

/**
 * The three newsletters from the concept. State lives in the core store, so a
 * choice survives a restart.
 */
const NEWSLETTERS = [
  {
    key: 'spotlight',
    label: 'Spotlight',
    description: 'Das Wichtigste, werktags am Morgen',
  },
  { key: 'spotlightCh', label: 'Spotlight Schweiz', description: 'Recherchen aus der Schweiz' },
  { key: 'klima', label: 'Klima', description: 'Die Klima-Recherchen der Woche' },
] as const;

/** How many investigations the impact card names. */
const IMPACT_COUNT = 3;

/**
 * Profil — membership, impact, report, backstage, saved articles, newsletters,
 * settings.
 *
 * Every section used to hang on `isMember`, with a second copy for a guest. Since
 * the door (ADR 0016) there is no guest here: whoever renders this screen signed in
 * with an entitlement that includes the app. The branches are gone with ADR 0018,
 * and what identifies the reader now comes from the session rather than from the
 * simulated club lever.
 *
 * The membership section used to set a contribution: an amount, an interval, and a
 * pause switch. It is a reading of the answer now, with one link out, because the app
 * offers no payment functions (ADR 0020).
 */
export default function ProfilScreen() {
  const actions = useCoreActions();
  const session = useSession();
  const settings = useSettings();
  const saved = useSavedArticles();
  const entitlement = session.entitlement;

  /**
   * The impact card's investigations come through the store, not out of the
   * generated bundle. Reading `offlineBundle.generated` here imported the whole
   * 6000-line module into this route independently of the `ContentBundle` port, and
   * evaluated the pick once at module scope, so the list could never go live. The
   * feed cascade answers from the network first and falls back to the same bundle
   * through the port, which is the arrangement every other list in the app has had
   * since ADR 0015. `web-target.test.ts` keeps the direct import from coming back.
   *
   * `recherchen` is the site-wide stream, so it carries fact checks too — they are
   * not impact investigations, which is why `isFactCheckUrl` filters them out.
   */
  const recherchen = useFeed('recherchen');
  const impactArticles = (recherchen.data ?? [])
    .filter((item) => !isFactCheckUrl(item.url))
    .slice(0, IMPACT_COUNT);

  const savedLabel =
    saved.length === 0
      ? 'Noch nichts gespeichert'
      : saved.length === 1
        ? '1 Artikel'
        : `${saved.length} Artikel`;

  return (
    <Screen>
      <Typo variant="headline-xl">Profil</Typo>

      <ClubCard
        name={session.account?.name ?? ''}
        tierLabel={TIER_LABELS[entitlement?.tier ?? 'paid']}
        memberSince={entitlement?.memberSince ?? null}
      />

      <View className="mt-l">
        <Overline label="Ihre Mitgliedschaft" />
        <Card className="mt-2xs">
          <Row label="Stufe" value={TIER_LABELS[entitlement?.tier ?? 'paid']} />
          {entitlement?.source && (
            <>
              <Hairline className="my-2xs" />
              <Row label="Zugang über" value={SOURCE_LABELS[entitlement.source]} />
            </>
          )}
          {entitlement?.validUntil && (
            <>
              <Hairline className="my-2xs" />
              <Row label="Läuft bis" value={formatDateShortDe(entitlement.validUntil)} />
            </>
          )}
          {entitlement && entitlement.localAreas.length > 0 && (
            <>
              <Hairline className="my-2xs" />
              <Row label="Lokale Newsletter" value={entitlement.localAreas.join(', ')} />
            </>
          )}
          <Button
            title="Konto verwalten"
            variant="secondary"
            fullWidth
            onPress={() => openExternal(ACCOUNT_URL)}
            className="mt-s"
          />
          <Typo variant="text-s" color="on-canvas-muted" className="mt-s">
            Beitrag, Zahlungsweise und Ihre Daten verwalten Sie in Ihrem Konto auf correctiv.org.
          </Typo>
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Ihr Impact" />
        <Card tone="surface" className="mt-2xs">
          <Typo variant="text-m">
            {impactLine(entitlement?.memberSince ?? null, impactArticles.length > 0)}
          </Typo>
          {impactArticles.map((article) => (
            <Pressable
              key={article.url}
              onPress={() => openArticle(article)}
              accessibilityRole="link"
              accessibilityLabel={article.title}
              className="mt-s active:opacity-70"
            >
              <Typo variant="text-m" weight="semibold" numberOfLines={2}>
                {article.title}
              </Typo>
            </Pressable>
          ))}
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Ihr Bereich" />
        <View className="mt-2xs">
          <NavCard
            icon="document-text-outline"
            title={quarterlyReport.quarter}
            subtitle="Wohin Ihr Beitrag fließt, transparent aufgeschlüsselt."
            club
            onPress={() => router.push('/bericht')}
          />
          <NavCard
            icon="sparkles-outline"
            title="Ihr Backstage"
            subtitle="Tagebücher, Bonusfolgen, Events"
            club
            onPress={() => router.push('/backstage')}
          />
          <NavCard
            icon="bookmark-outline"
            title="Gespeicherte Artikel"
            subtitle={savedLabel}
            onPress={() => router.push('/gespeichert')}
          />
          <NavCard
            icon="settings-outline"
            title="App-Einstellungen"
            subtitle="Benachrichtigungen, Textgröße, Über CORRECTIV"
            onPress={() => router.push('/einstellungen')}
          />
        </View>
      </View>

      <View className="mt-m">
        <Overline label="Newsletter" />
        <Card className="mt-2xs">
          {NEWSLETTERS.map((newsletter, i) => (
            <View key={newsletter.key}>
              {i > 0 && <Hairline className="my-2xs" />}
              <SettingRow
                label={newsletter.label}
                description={newsletter.description}
                value={settings.newsletter[newsletter.key]}
                onValueChange={(value) => actions.settings.setNewsletter(newsletter.key, value)}
              />
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

/**
 * How long they have been aboard — rough, but never "for 0 months".
 *
 * Tolerates a missing date, because one is reachable: an entitlement persisted by a
 * build before `memberSince` existed hydrates without it and is kept until the next
 * sign-in (see `Entitlement.memberSince`). An empty card is worse than a sentence
 * that does not count months.
 *
 * `hasArticles` exists because the list is loaded rather than bundled at module
 * scope: for the moment before the feed answers there is nothing to introduce, and
 * a sentence ending in a colon over an empty card reads as a defect.
 */
function impactLine(memberSince: string | null, hasArticles: boolean): string {
  if (!memberSince) {
    return hasArticles
      ? 'Ihr Beitrag ermöglicht diese Recherchen. Unter anderem diese hier:'
      : 'Ihr Beitrag ermöglicht diese Recherchen.';
  }
  const months = Math.max(
    1,
    Math.round((Date.now() - new Date(memberSince).getTime()) / (30 * 864e5)),
  );
  const time = months < 2 ? 'seit Kurzem' : `seit ${months} Monaten`;
  const lead = `Sie unterstützen CORRECTIV ${time}.`;
  return hasArticles ? `${lead} Unter anderem diese Recherchen wurden mit ermöglicht:` : lead;
}

/** One label/value line in the membership card. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-s">
      <Typo variant="text-m" color="on-canvas-muted">
        {label}
      </Typo>
      <Typo variant="text-m" weight="semibold" className="shrink text-right">
        {value}
      </Typo>
    </View>
  );
}
