import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EpisodeRow } from '@/components/media/EpisodeRow';
import { ScreenHeader, Typo } from '@/components/ui';
import { PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import type { PodcastEpisode, PodcastSeries } from '@correctiv/app-core/data/podcasts';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { playEpisode, togglePlay } from '@/lib/audio/player';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { useIsMember, usePodcastSeries } from '@/lib/store/core';
import { useColors } from '@/lib/theme';

/**
 * The seven curated shows are known, so the static web export can emit one file per
 * series. Without it /serie/pausenbrot answers 404 on a host without rewrites — the
 * same case as /projekt/<id>.
 */
export function generateStaticParams(): { id: string }[] {
  return PODCAST_CHANNELS.map((handle) => ({ id: handle }));
}

/** One podcast series with its episodes. */
export default function SerieScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { series, status } = usePodcastSeries(id ?? '');

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />

      {!series ? (
        <View className="flex-1 items-center justify-center px-m">
          {status === 'loading' || status === 'idle' ? (
            <ActivityIndicator color={colors.emphasis} />
          ) : (
            <>
              <Typo variant="headline-s" className="text-center">
                Diese Serie gibt es nicht
              </Typo>
              <Typo variant="text-m" color="grey-600" className="mt-2xs text-center">
                {id ? `Unbekannte Kennung „${id}“.` : 'Es wurde keine Kennung übergeben.'}
              </Typo>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-m pt-m pb-2xl"
          showsVerticalScrollIndicator={false}
        >
          <Typo variant="headline-l">{series.title}</Typo>
          <Typo variant="text-s" color="emphasis" className="mt-4xs">
            {series.publisher}
          </Typo>
          <Typo variant="text-m" color="grey-600" className="mt-s">
            {series.description}
          </Typo>

          {/* The same note the Mediathek shows over its rail. Without it this page is
              where the offline fallback stops being honest: two seeded episodes read
              as the whole show. Castopod sends no CORS header, so on the web target
              this is the normal case, not an edge one. */}
          {status === 'offline' && (
            <Typo variant="text-s" color="grey-600" className="mt-s">
              Ohne Verbindung. Sie sehen Beispielfolgen.
            </Typo>
          )}

          <View className="mt-m">
            {series.episodes.map((episode) => (
              <SeriesEpisodeRow key={episode.id} series={series} episode={episode} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SeriesEpisodeRow({ series, episode }: { series: PodcastSeries; episode: PodcastEpisode }) {
  const isMember = useIsMember();
  const status = useEpisodeStatus(episode.id);
  const previewOnly = Boolean(episode.club) && !isMember;

  return (
    <EpisodeRow
      episodeId={episode.id}
      title={episode.title}
      meta={`${formatDateShortDe(episode.date)} · ${episode.durationLabel}`}
      club={episode.club}
      metaSuffix={previewOnly ? 'Für alle hörbar' : undefined}
      onPress={() => {
        if (status !== 'off') {
          togglePlay();
          return;
        }
        const track = {
          title: episode.title,
          subtitle: `${series.title} · ${series.publisher}`,
          url: episode.audio,
          episodeId: episode.id,
        };
        void playEpisode(track);
      }}
    />
  );
}
