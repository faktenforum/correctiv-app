import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { VideoFrame } from '@/components/media/VideoFrame';
import { Button, Overline, ScreenHeader, Typo } from '@/components/ui';
import { formatDateDe, formatMinutesDe, formatNumberDe } from '@correctiv/app-core/lib/format';
import type { Video } from '@correctiv/app-core/types/models';
import { useVideo } from '@/lib/store/core';
import { openExternal } from '@/lib/openExternal';
import { colors } from '@/lib/theme';

/**
 * Ein Bildschirm für beide Videoquellen.
 *
 * PeerTube spielt nativ über expo-video (HLS, adaptiv — die Renditionen sind
 * getrennt in Video-only und Audio-only, nur die Master-Playlist mischt beides).
 * YouTube bleibt bei der nocookie-Einbettung, weil es dort keinen direkten Stream
 * gibt. Der Core spiegelt diese Zweiteilung schon in `MEDIA_SOURCE`.
 *
 * Kein Pfad-Parameter, sondern der `videoStore` des Core: die Metadaten (Titel,
 * Beschreibung, Aufrufe, HLS-URL) sind zu viel für eine URL, und der Store ist
 * ohnehin die Stelle, die die HLS-Auflösung besitzt. Als Route ohne Parameter
 * exportiert sie außerdem als eine Datei — ein `video/[id]` bräuchte
 * `generateStaticParams`, und PeerTube-UUIDs kennt niemand im Voraus.
 *
 * Bewusste Abweichung vom NativeScript-Stand: dort lag die Videofläche ÜBER den
 * Tab-Frames und schrumpfte beim Verlassen zur Leiste. React Native kann eine
 * Videofläche nicht umhängen, ohne sie neu zu erzeugen (die Wiedergabe würde
 * abbrechen) — die nativ passende Antwort ist Picture-in-Picture, die expo-video
 * mitbringt.
 */
export default function VideoScreen() {
  const { current, hlsUrl, status } = useVideo();

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader onBack={() => router.back()} />
      {!current ? (
        <View className="flex-1 items-center justify-center px-m">
          <Typo variant="text-m" color="grey-600">
            Kein Video ausgewählt.
          </Typo>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="bg-grey-700" style={{ aspectRatio: 16 / 9 }}>
            {current.source === 'peertube' ? (
              <PeertubeStage
                hlsUrl={hlsUrl}
                loading={status === 'loading'}
                failed={status === 'error'}
              />
            ) : (
              <VideoFrame
                uri={`https://www.youtube-nocookie.com/embed/${current.id}?playsinline=1&rel=0`}
              />
            )}
          </View>
          <VideoMeta video={current} />
        </ScrollView>
      )}
    </View>
  );
}

/** Nativer HLS-Player. Eigene Komponente, weil `useVideoPlayer` ein Hook ist. */
function PeertubeStage({
  hlsUrl,
  loading,
  failed,
}: {
  hlsUrl: string;
  loading: boolean;
  failed: boolean;
}) {
  const player = useVideoPlayer(hlsUrl || null, (instance) => {
    instance.play();
  });

  if (!hlsUrl) {
    return (
      <View className="flex-1 items-center justify-center">
        {loading ? (
          <ActivityIndicator color={colors['grey-100']} />
        ) : (
          <Typo variant="text-s" color="grey-100">
            {failed ? 'Video nicht verfügbar' : 'Lädt …'}
          </Typo>
        )}
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      contentFit="contain"
      nativeControls
      // Statt der Leiste des NativeScript-Stands: das System übernimmt das Fenster.
      allowsPictureInPicture
      startsPictureInPictureAutomatically
    />
  );
}

/** Kicker, Titel, Quelle, Beschreibung, Link — für beide Quellen gleich. */
function VideoMeta({ video }: { video: Video }) {
  const days = daysSince(video.publishedAt);
  const when = days <= 0 ? 'Heute' : days === 1 ? 'Gestern' : formatDateDe(video.publishedAt);
  const duration = video.durationSec ? formatMinutesDe(video.durationSec) : '';
  const views = video.views != null ? `${formatNumberDe(video.views)} Aufrufe` : '';
  const channel = video.source === 'peertube' ? 'FunFacts' : 'CORRECTIV';
  const host = (video.url || '').replace(/^https?:\/\//, '').split('/')[0];

  return (
    <View className="px-m pb-2xl pt-m">
      <View className="flex-row items-center">
        <Overline label={days <= 7 ? 'Neue Folge' : 'Video'} color="emphasis" />
        <Typo variant="text-s" color="grey-500" className="ml-s">
          {[when, duration].filter(Boolean).join(' · ')}
        </Typo>
      </View>

      <Typo variant="headline-l" className="mt-2xs">
        {video.title}
      </Typo>
      <Typo variant="text-s" color="grey-600" className="mt-2xs">
        {[channel, views].filter(Boolean).join(' · ')}
      </Typo>

      {video.description ? (
        <Typo variant="text-m" color="grey-600" className="mt-s">
          {video.description}
        </Typo>
      ) : null}

      {video.url ? (
        <Button
          title={host ? `Auf ${host} ansehen` : 'Original ansehen'}
          variant="outline"
          className="mt-m"
          onPress={() => openExternal(video.url)}
        />
      ) : null}
    </View>
  );
}

/** Ganze Tage seit Veröffentlichung — steuert Kicker und relatives Datum. */
function daysSince(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / 86400000);
}
