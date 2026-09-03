import { router } from 'expo-router';
import { View } from 'react-native';

import { ClubCard } from '@/components/profile/ClubCard';
import { NavCard } from '@/components/profile/NavCard';
import { SettingRow } from '@/components/profile/SettingRow';
import { Button, Card, Hairline, Overline, Screen, Typo } from '@/components/ui';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import type { Entitlement } from '@correctiv/app-core/types/models';
import { quarterlyReport } from '@correctiv/app-core/data/quartalsbericht';
import { OFFLINE_ARTICLES } from '@/lib/articles/offlineBundle.generated';
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

/**
 * Three real investigations from the bundled offline index.
 *
 * An earlier version filtered on `feed === 'recherchen'`. This index is keyed by URL
 * and carries no feed field, so the URL decides. Fact checks are not impact
 * investigations.
 */
const IMPACT_ARTICLES = Object.entries(OFFLINE_ARTICLES)
  .filter(([url]) => !url.includes('/faktencheck/'))
  .slice(0, 3)
  .map(([url, article]) => ({ url, title: article.title }));

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
          <Typo variant="text-s" color="grey-600" className="mt-s">
            Beitrag, Zahlungsweise und Ihre Daten verwalten Sie in Ihrem Konto auf correctiv.org.
          </Typo>
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Ihr Impact" />
        <Card tone="surface" className="mt-2xs">
          <Typo variant="text-m">{impactLine(entitlement?.memberSince ?? null)}</Typo>
          {IMPACT_ARTICLES.map((article) => (
            <Typo
              key={article.url}
              variant="text-m"
              weight="semibold"
              numberOfLines={2}
              className="mt-s"
              onPress={() => openArticle(article)}
            >
              {article.title}
            </Typo>
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
 */
function impactLine(memberSince: string | null): string {
  if (!memberSince) return 'Ihr Beitrag ermöglicht diese Recherchen. Unter anderem diese hier:';
  const months = Math.max(
    1,
    Math.round((Date.now() - new Date(memberSince).getTime()) / (30 * 864e5)),
  );
  const time = months < 2 ? 'seit Kurzem' : `seit ${months} Monaten`;
  return `Sie unterstützen CORRECTIV ${time}. Unter anderem diese Recherchen wurden mit ermöglicht:`;
}

/** One label/value line in the membership card. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-s">
      <Typo variant="text-m" color="grey-600">
        {label}
      </Typo>
      <Typo variant="text-m" weight="semibold" className="shrink text-right">
        {value}
      </Typo>
    </View>
  );
}
