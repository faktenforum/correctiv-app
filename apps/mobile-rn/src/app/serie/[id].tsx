import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EpisodeRow } from '@/components/media/EpisodeRow';
import { ScreenHeader, Typo } from '@/components/ui';
import { PODCAST_CHANNELS } from '@correctiv/app-core/data/feeds.config';
import type { PodcastEpisode, PodcastSeries } from '@correctiv/app-core/data/podcasts';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import { playEpisode, playPreview, togglePlay } from '@/lib/audio/player';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { useIsMember, usePodcastSeries } from '@/lib/store/core';
import { colors } from '@/lib/theme';

/**
 * Die sieben kuratierten Shows sind bekannt, also kann der statische Web-Export
 * eine Datei pro Serie erzeugen. Ohne das antwortet /serie/pausenbrot auf einem
 * Host ohne Rewrites mit 404 — derselbe Fall wie bei /projekt/<id>.
 */
export function generateStaticParams(): { id: string }[] {
  return PODCAST_CHANNELS.map((handle) => ({ id: handle }));
}

/** Eine Podcast-Serie mit ihren Folgen. */
export default function SerieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { series, status } = usePodcastSeries(id ?? '');

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader onBack={() => router.back()} />

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
      metaSuffix={previewOnly ? '60 Sek. anspielen' : undefined}
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
        void (previewOnly ? playPreview(track) : playEpisode(track));
      }}
    />
  );
}
