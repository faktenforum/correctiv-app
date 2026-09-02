import { router } from 'expo-router';
import { View } from 'react-native';

import { ClubCard } from '@/components/profile/ClubCard';
import { NavCard } from '@/components/profile/NavCard';
import { SettingRow } from '@/components/profile/SettingRow';
import { Button, Card, Hairline, Overline, Screen, Typo } from '@/components/ui';
import { quarterlyReport } from '@correctiv/app-core/data/quartalsbericht';
import { OFFLINE_ARTICLES } from '@/lib/articles/offlineBundle.generated';
import { TIER_LABELS } from '@/lib/membership/tierLabel';
import { openArticle } from '@/lib/openArticle';
import {
  useCoreActions,
  useMembership,
  useSavedArticles,
  useSession,
  useSettings,
} from '@/lib/store/core';

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
 */
export default function ProfilScreen() {
  const actions = useCoreActions();
  const session = useSession();
  const membership = useMembership();
  const settings = useSettings();
  const saved = useSavedArticles();

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
        name={session.account?.name || membership.name}
        tierLabel={TIER_LABELS[session.entitlement?.tier ?? 'paid']}
        memberSince={membership.memberSince}
      />

      <View className="mt-l">
        <Overline label="Meine Mitgliedschaft" />
        <Card className="mt-2xs">
          <View className="flex-row items-center justify-between">
            <Typo variant="text-m">Ihr Beitrag</Typo>
            <Typo variant="headline-xs">
              {membership.amountEur} € / {membership.interval === 'monatlich' ? 'Monat' : 'Jahr'}
            </Typo>
          </View>
          <View className="mt-s flex-row gap-s">
            <Button
              title="Beitrag ändern"
              variant="secondary"
              onPress={openJoinFlow}
              className="flex-1"
            />
            <Button
              title={membership.paused ? 'Fortsetzen' : 'Pausieren'}
              variant="secondary"
              onPress={() => actions.membership.setPaused(!membership.paused)}
              className="flex-1"
            />
          </View>
          {membership.paused && (
            <Typo variant="text-s" color="grey-600" className="mt-s">
              Ihre Mitgliedschaft ist pausiert (simuliert). Backstage bleibt bis Monatsende offen.
            </Typo>
          )}
        </Card>
      </View>

      <View className="mt-m">
        <Overline label="Mein Impact" />
        <Card tone="surface" className="mt-2xs">
          <Typo variant="text-m">{impactLine(membership.memberSince)}</Typo>
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
 * `memberSince` is stamped by the simulated join, so an account that signed in at
 * the door has none. That used to be unreachable, because the section only rendered
 * for a member the join had created. It is reachable now, hence the second sentence
 * rather than an empty card.
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

function openJoinFlow(): void {
  router.push('/beitreten');
}
