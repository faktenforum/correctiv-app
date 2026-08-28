import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ArticleHero } from '@/components/feed/ArticleHero';
import { ArticleRow } from '@/components/feed/ArticleRow';
import { FaktencheckRail } from '@/components/feed/FaktencheckRail';
import { BackstageTeaser } from '@/components/home/BackstageTeaser';
import { CalloutTeaser } from '@/components/home/CalloutTeaser';
import { EarlyAccessCard } from '@/components/home/EarlyAccessCard';
import { HomeHeader } from '@/components/home/HomeHeader';
import { ImpactFooter } from '@/components/home/ImpactFooter';
import { MediathekReihe } from '@/components/home/MediathekReihe';
import { SpotlightBriefing } from '@/components/home/SpotlightBriefing';
import { Hairline, Screen, SectionHeader, Typo } from '@/components/ui';
import { callouts } from '@correctiv/app-core/data/callouts';
import { useFeed } from '@/lib/feeds/useFeed';
import { openArticle } from '@/lib/openArticle';
import { useColors } from '@/lib/theme';

/**
 * Home — a curated cross-section of the ecosystem, in the draft's order: lead
 * research, today's briefing, the club's early access, the latest research, fact
 * checks, one open callout, the media row, backstage, and a quiet thank-you.
 *
 * LIVE from the feeds: hero, "Neueste Recherchen", the fact-check rail and the
 * FunFacts tile. Sample data: briefing, early access, callout, backstage — each
 * one exists to show a flow the feeds cannot supply.
 */
export default function HomeScreen() {
  const colors = useColors();
  const recherchen = useFeed('recherchen');
  const faktenchecks = useFeed('faktencheck');

  const hero = recherchen.data?.[0];
  const neueste = recherchen.data?.slice(1, 6) ?? [];
  const callout = callouts.find((entry) => entry.status === 'open');

  return (
    <Screen>
      <HomeHeader />

      {(recherchen.offline || faktenchecks.offline) && (
        <Typo variant="text-s" color="grey-600" className="mt-2xs">
          Ohne Verbindung. Sie sehen gespeicherte Artikel.
        </Typo>
      )}

      {recherchen.loading && !recherchen.data && (
        <View className="py-2xl">
          <ActivityIndicator color={colors.emphasis} />
        </View>
      )}

      {hero && <ArticleHero item={hero} onPress={openArticle} />}

      <View className="mt-l">
        <SpotlightBriefing onOpenArchive={() => router.push('/spotlight')} />
      </View>

      <View className="mt-l">
        <EarlyAccessCard onPress={() => router.push('/(tabs)/profil')} />
      </View>

      {neueste.length > 0 && (
        <View className="mt-l">
          <SectionHeader title="Neueste Recherchen" />
          <View className="mt-2xs">
            {neueste.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <Hairline />}
                <ArticleRow item={item} onPress={openArticle} />
              </View>
            ))}
          </View>
        </View>
      )}

      {(faktenchecks.data?.length ?? 0) > 0 && (
        <View className="mt-l">
          <SectionHeader
            title="Faktenchecks"
            className="mb-s"
            actionLabel="Alle ansehen →"
            onAction={() => router.push('/(tabs)/entdecken')}
          />
          <FaktencheckRail items={faktenchecks.data!.slice(0, 8)} onPress={openArticle} />
        </View>
      )}

      {callout && (
        <View className="mt-l">
          <CalloutTeaser
            callout={callout}
            onPress={(entry) =>
              router.push({ pathname: '/aufruf/[slug]', params: { slug: entry.slug } })
            }
          />
        </View>
      )}

      <View className="mt-l">
        <SectionHeader
          title="Mediathek"
          className="mb-s"
          actionLabel="Alles ansehen →"
          onAction={() => router.push('/(tabs)/mediathek')}
        />
        <MediathekReihe onOpenMediathek={() => router.push('/(tabs)/mediathek')} />
      </View>

      <View className="mt-l">
        <BackstageTeaser
          onOpenDiary={(id) => router.push({ pathname: '/tagebuch/[id]', params: { id } })}
          onOpenBackstage={() => router.push('/backstage')}
        />
      </View>

      <ImpactFooter onJoin={() => router.push('/(tabs)/profil')} />
    </Screen>
  );
}
