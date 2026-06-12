<template>
  <Page actionBarHidden="true" @loaded="onLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="pb-m">
          <Label text="Mediathek" class="ty-headline-xl text-grey-700 px-sm pt-m" textWrap="true" />

          <!-- Live radio -->
          <StackLayout class="px-sm pt-s">
            <LiveBanner />
          </StackLayout>

          <!-- Podcasts -->
          <SectionHeader title="Podcasts" />
          <ScrollView orientation="horizontal" class="series-rail">
            <StackLayout orientation="horizontal" class="px-xs">
              <StackLayout
                v-for="series in podcastSeries"
                :key="series.id"
                class="series-tile"
                @tap="openSeries(series)"
              >
                <GridLayout class="series-tile__cover" :class="`series-tile__cover--${series.id}`">
                  <Label :text="icons.mic" class="lucide series-tile__icon" />
                </GridLayout>
                <Label :text="series.title" class="series-tile__title" textWrap="true" :maxLines="2" />
                <Label :text="series.publisher" class="series-tile__publisher" />
              </StackLayout>
            </StackLayout>
          </ScrollView>

          <!-- CORRECTIV im Gespräch (LIVE) -->
          <SectionHeader title="CORRECTIV im Gespräch" />
          <ScrollView orientation="horizontal" class="media-row">
            <StackLayout orientation="horizontal">
              <MediaCard
                v-for="video in media.byKey.gespraech.videos.slice(0, 6)"
                :key="video.id"
                :title="video.title"
                :thumbnail="video.thumbnailUrl"
                :subtitle="formatDateShortDe(video.publishedAt)"
                @open="openVideo(video, 'CORRECTIV im Gespräch')"
              />
              <Label v-if="media.byKey.gespraech.status === 'error'" text="Videos derzeit nicht erreichbar." class="ty-text-s text-grey-600 px-sm" />
            </StackLayout>
          </ScrollView>

          <!-- FunFacts (LIVE) -->
          <SectionHeader title="FunFacts" />
          <ScrollView orientation="horizontal" class="media-row">
            <StackLayout orientation="horizontal">
              <MediaCard
                v-for="video in media.byKey.funfacts.videos.slice(0, 6)"
                :key="video.id"
                :title="video.title"
                :thumbnail="video.thumbnailUrl"
                :subtitle="formatDateShortDe(video.publishedAt)"
                @open="openVideo(video, 'FunFacts')"
              />
            </StackLayout>
          </ScrollView>

          <!-- Backstage audio (club) -->
          <SectionHeader title="Aus dem Backstage" />
          <GridLayout
            v-for="bonus in bonusMedia"
            :key="bonus.id"
            columns="auto, *, auto"
            class="episode-row mx-sm bonus-row"
            @tap="playBonus(bonus)"
          >
            <Label col="0" :text="icons.headphones" class="lucide episode-row__play" />
            <StackLayout col="1" verticalAlignment="center">
              <Label :text="bonus.title" class="episode-row__title" textWrap="true" />
              <Label
                :text="membership.isMember ? bonus.durationLabel : `${bonus.durationLabel} · 60 Sek. anspielen`"
                class="episode-row__meta"
              />
            </StackLayout>
            <ClubBadge col="2" verticalAlignment="center" />
          </GridLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import type { Video } from '../../types/models';
import LiveBanner from '../../components/ui/LiveBanner.vue';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import ClubBadge from '../../components/ui/ClubBadge.vue';
import MediaCard from '../../components/cards/MediaCard.vue';
import SeriesPage from './SeriesPage.vue';
import VideoPlayerPage from './VideoPlayerPage.vue';
import { podcastSeries, type PodcastSeries } from '../../data/podcasts';
import { bonusMedia, type BonusMedia } from '../../data/backstage';
import { useMediaStore } from '../../stores/media';
import { useAudioStore } from '../../stores/audio';
import { useMembershipStore } from '../../stores/membership';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateShortDe } from '../../lib/format';

const media = useMediaStore();
const audioStore = useAudioStore();
const membership = useMembershipStore();
const { navigate } = useNavigation();

let loaded = false;
function onLoaded() {
  if (loaded) return;
  loaded = true;
  media.fetch('gespraech');
  media.fetch('funfacts');
}

function openSeries(series: PodcastSeries) {
  navigate(SeriesPage, { props: { series } });
}

function openVideo(video: Video, channel: string) {
  navigate(VideoPlayerPage, { props: { video, channel } });
}

function playBonus(bonus: BonusMedia) {
  const track = {
    title: bonus.title,
    subtitle: 'Backstage · Club',
    url: bonus.source,
    episodeId: bonus.id,
  };
  if (membership.isMember) {
    audioStore.playEpisode(track);
  } else {
    audioStore.playPreview(track);
  }
}
</script>
