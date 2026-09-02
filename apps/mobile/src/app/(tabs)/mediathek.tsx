import { router } from 'expo-router';
import { View } from 'react-native';

import { EpisodeRow } from '@/components/media/EpisodeRow';
import { LiveBanner } from '@/components/media/LiveBanner';
import { MediaCard } from '@/components/media/MediaCard';
import { SeriesTile } from '@/components/media/SeriesTile';
import { Rail, Screen, SectionHeader, Typo } from '@/components/ui';
import { bonusMedia, type BonusMedia } from '@correctiv/app-core/data/backstage';
import type { PodcastSeries } from '@correctiv/app-core/data/podcasts';
import type { YoutubeKey } from '@correctiv/app-core/stores/media';
import type { Video } from '@correctiv/app-core/types/models';
import { playEpisode, togglePlay } from '@/lib/audio/player';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { useCoreActions, usePodcastLibrary, useVideoChannel } from '@/lib/store/core';

/**
 * Mediathek — everything audible and watchable: live radio, the Salon5 podcasts
 * (Castopod), two video channels and the club's Backstage bonus track.
 *
 * All four sources are live; only the Backstage bonus is sample data with bundled
 * audio, because it exists to show the club preview flow.
 */
export default function MediathekScreen() {
  const podcasts = usePodcastLibrary();

  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-s">
        Mediathek
      </Typo>

      <LiveBanner subtitle="24/7 aus Bottrop, von Jugendlichen für Jugendliche" />

      <View className="mt-l">
        <SectionHeader title="Podcasts" className="mb-s" />
        {podcasts.status === 'offline' && (
          <Typo variant="text-s" color="grey-600" className="mb-2xs">
            Ohne Verbindung. Sie sehen Beispielfolgen.
          </Typo>
        )}
        <Rail>
          {podcasts.series.map((series) => (
            <SeriesTile key={series.id} series={series} onPress={openSeries} />
          ))}
        </Rail>
      </View>

      <VideoRail title="CORRECTIV im Gespräch" channel="gespraech" />
      <VideoRail title="FunFacts" channel="funfacts" />

      <View className="mt-l">
        <SectionHeader title="Aus dem Backstage" />
        {/* No club label here: every row already carries the yellow Club badge, and a
            coral one above them said the same word twice in the wrong colour — coral
            is the journalism CTA, yellow is the club (see ui/Button.tsx). */}
        <View className="mt-2xs">
          {bonusMedia.map((bonus) => (
            <BonusRow key={bonus.id} bonus={bonus} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function VideoRail({ title, channel }: { title: string; channel: YoutubeKey }) {
  const { videos, status } = useVideoChannel(channel);
  const actions = useCoreActions();

  const openVideo = (video: Video) => {
    // The core store owns the HLS resolution; the route reads it.
    void actions.video.play(video);
    router.push('/video');
  };

  return (
    <View className="mt-l">
      <SectionHeader title={title} className="mb-s" />
      {status === 'error' && videos.length === 0 ? (
        <Typo variant="text-s" color="grey-600">
          Videos derzeit nicht erreichbar.
        </Typo>
      ) : (
        <Rail>
          {videos.slice(0, 6).map((video) => (
            <MediaCard key={video.id} video={video} onPress={openVideo} />
          ))}
        </Rail>
      )}
    </View>
  );
}

/**
 * The club's bonus audio. Members hear the whole episode, everyone else 60 seconds —
 * the preview is the invitation, not the lock.
 */
function BonusRow({ bonus }: { bonus: BonusMedia }) {
  const status = useEpisodeStatus(bonus.id);

  const track = {
    title: bonus.title,
    subtitle: 'Backstage · Club',
    url: bonus.source,
    episodeId: bonus.id,
  };

  return (
    <EpisodeRow
      episodeId={bonus.id}
      title={bonus.title}
      meta={bonus.durationLabel}
      club={bonus.club}
      onPress={() => {
        // If this episode is already loaded, the tap is play/pause, not a restart.
        if (status !== 'off') {
          togglePlay();
          return;
        }
        void playEpisode(track);
      }}
    />
  );
}

function openSeries(series: PodcastSeries) {
  router.push({ pathname: '/serie/[id]', params: { id: series.id } });
}
