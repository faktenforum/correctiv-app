import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { EpisodeRow } from '@/components/media/EpisodeRow';
import { LiveBanner } from '@/components/media/LiveBanner';
import { MediaCard } from '@/components/media/MediaCard';
import { SeriesTile } from '@/components/media/SeriesTile';
import { Overline, Screen, SectionHeader, Typo } from '@/components/ui';
import { bonusMedia, type BonusMedia } from '@correctiv/app-core/data/backstage';
import type { PodcastSeries } from '@correctiv/app-core/data/podcasts';
import type { YoutubeKey } from '@correctiv/app-core/stores/media';
import type { Video } from '@correctiv/app-core/types/models';
import { playEpisode, playPreview, togglePlay } from '@/lib/audio/player';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { coreActions, useIsMember, usePodcastLibrary, useVideoChannel } from '@/lib/store/core';

/**
 * Mediathek — alles Hörbare und Sehbare: Live-Radio, Salon5-Podcasts (Castopod),
 * zwei Video-Kanäle und die Backstage-Bonusspur des Clubs.
 *
 * Alle vier Quellen sind live; nur der Backstage-Bonus ist Beispieldaten mit
 * gebündeltem Audio, weil er den Club-Vorschau-Fluss zeigt.
 */
export default function MediathekScreen() {
  const podcasts = usePodcastLibrary();

  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-s">
        Mediathek
      </Typo>

      <LiveBanner subtitle="24/7 aus Bottrop — von Jugendlichen für Jugendliche" />

      <View className="mt-l">
        <SectionHeader title="Podcasts" className="mb-s" />
        {podcasts.status === 'offline' && (
          <Typo variant="text-s" color="grey-600" className="mb-2xs">
            Ohne Verbindung — Sie sehen Beispielfolgen.
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
        <Overline label="Club" color="emphasis" className="mt-2xs" />
        <View className="mt-2xs">
          {bonusMedia.map((bonus) => (
            <BonusRow key={bonus.id} bonus={bonus} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

/** Horizontale Schiene mit den Abständen der Home-Rails (gleiche Optik). */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 24, gap: 12 }}
    >
      {children}
    </ScrollView>
  );
}

function VideoRail({ title, channel }: { title: string; channel: YoutubeKey }) {
  const { videos, status } = useVideoChannel(channel);

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
 * Bonus-Audio des Clubs. Mitglieder hören die ganze Folge, alle anderen 60
 * Sekunden — die Vorschau ist die Einladung, nicht die Sperre.
 */
function BonusRow({ bonus }: { bonus: BonusMedia }) {
  const isMember = useIsMember();
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
      metaSuffix={isMember ? undefined : '60 Sek. anspielen'}
      club={bonus.club}
      onPress={() => {
        // Läuft diese Folge schon, ist der Druck Play/Pause — kein Neustart.
        if (status !== 'off') {
          togglePlay();
          return;
        }
        void (isMember ? playEpisode(track) : playPreview(track));
      }}
    />
  );
}

function openSeries(series: PodcastSeries) {
  router.push({ pathname: '/serie/[id]', params: { id: series.id } });
}

function openVideo(video: Video) {
  // Der Core-Store besitzt die HLS-Auflösung; die Route liest ihn.
  void coreActions.video().play(video);
  router.push('/video');
}
