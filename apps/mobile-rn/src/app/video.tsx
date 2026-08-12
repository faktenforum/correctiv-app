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
 * One screen for both video sources.
 *
 * PeerTube plays natively through expo-video (HLS, adaptive — the renditions are
 * split into video-only and audio-only, and only the master playlist mixes the
 * two). YouTube stays on the nocookie embed, because there is no direct stream
 * there. The core already mirrors that split in `MEDIA_SOURCE`.
 *
 * No path parameter, but the core's `videoStore`: the metadata (title, description,
 * views, HLS url) is too much for a URL, and the store is where the HLS resolution
 * lives anyway. Without a parameter the route also exports as a single file — a
 * `video/[id]` would need `generateStaticParams`, and nobody knows a PeerTube UUID
 * in advance.
 *
 * A deliberate divergence from the NativeScript build: there the video surface sat
 * ABOVE the tab frames and shrank into a bar when you navigated away. React Native
 * cannot re-parent a video surface without recreating it, which would stop
 * playback — the natively appropriate answer is picture-in-picture, which
 * expo-video brings along.
 */
export default function VideoScreen() {
  const { current, hlsUrl, status } = useVideo();

  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      {!current ? (
        <View className="flex-1 items-center justify-center px-m">
          <Typo variant="text-m" color="grey-600">
            Kein Video ausgewählt.
          </Typo>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Die Bühne bleibt in beiden Schemata dunkel — ein Video steht nicht
              auf einer hellen Fläche, auch nicht bei heller App. */}
          <View className="bg-always-dark" style={{ aspectRatio: 16 / 9 }}>
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

/** The native HLS player. Its own component, because `useVideoPlayer` is a hook. */
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
          <ActivityIndicator color={colors['always-light']} />
        ) : (
          <Typo variant="text-s" color="always-light">
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
      // Instead of the NativeScript build's bar: the system takes over the window.
      allowsPictureInPicture
      startsPictureInPictureAutomatically
    />
  );
}

/** Kicker, title, source, description, link — the same for both sources. */
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

/** Whole days since publication — drives the kicker and the relative date. */
function daysSince(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / 86400000);
}
