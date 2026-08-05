import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ArticleHero } from '@/components/feed/ArticleHero';
import { ArticleRow } from '@/components/feed/ArticleRow';
import { FaktencheckRail } from '@/components/feed/FaktencheckRail';
import { EarlyAccessCard } from '@/components/home/EarlyAccessCard';
import { ImpactFooter } from '@/components/home/ImpactFooter';
import { MediathekReihe } from '@/components/home/MediathekReihe';
import { SpotlightBriefing } from '@/components/home/SpotlightBriefing';
import { Hairline, Screen, SectionHeader, Typo } from '@/components/ui';
import { useFeed } from '@/lib/feeds/useFeed';
import { openArticle } from '@/lib/openArticle';
import { colors } from '@/lib/theme';

/**
 * Home — kuratierter Querschnitt durchs Ökosystem. LIVE: Hero + Neueste
 * Recherchen (Haupt-Feed), Faktencheck-Rail. SAMPLE: Spotlight-Briefing,
 * Early-Access-Karte. In M3–M5 kommen Mediathek-Reihe, Mitmach- und Backstage-Modul hinzu.
 */
export default function HomeScreen() {
  const recherchen = useFeed('haupt');
  const faktenchecks = useFeed('faktencheck');

  const hero = recherchen.data?.[0];
  const neueste = recherchen.data?.slice(1, 6) ?? [];

  return (
    <Screen>
      <Typo variant="headline-xl">CORRECTIV</Typo>
      <Typo variant="text-s" color="grey-600" className="mb-m">
        Recherchen für die Gesellschaft
      </Typo>

      {recherchen.loading && !recherchen.data && (
        <View className="py-2xl">
          <ActivityIndicator color={colors.emphasis} />
        </View>
      )}

      {hero && <ArticleHero item={hero} onPress={openArticle} />}

      <View className="mt-l">
        <SpotlightBriefing />
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
          <SectionHeader title="Faktenchecks" className="mb-s" />
          <FaktencheckRail items={faktenchecks.data!.slice(0, 8)} onPress={openArticle} />
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

      <ImpactFooter onJoin={() => router.push('/(tabs)/profil')} />
    </Screen>
  );
}
