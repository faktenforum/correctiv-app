<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" :text="series.title" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="py-s">
          <StackLayout class="px-sm pb-s">
            <Label :text="series.publisher" class="ty-text-s text-emphasis" />
            <Label :text="series.description" class="ty-text-m text-grey-600 mt-xs" textWrap="true" />
          </StackLayout>
          <GridLayout
            v-for="episode in series.episodes"
            :key="episode.id"
            columns="auto, *, auto"
            class="episode-row hairline-bottom"
            @tap="play(episode)"
          >
            <Label col="0" :text="isCurrent(episode) && audioStore.status === 'playing' ? icons.pause : icons.play" class="lucide episode-row__play" />
            <StackLayout col="1" verticalAlignment="center">
              <Label :text="episode.title" class="episode-row__title" textWrap="true" />
              <Label :text="`${formatDateShortDe(episode.date)} · ${episode.durationLabel}`" class="episode-row__meta" />
            </StackLayout>
            <ClubBadge v-if="episode.club" col="2" verticalAlignment="center" />
          </GridLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import type { PodcastSeries, PodcastEpisode } from '../../data/podcasts';
import ClubBadge from '../../components/ui/ClubBadge.vue';
import { useAudioStore } from '../../stores/audio';
import { useMembershipStore } from '../../stores/membership';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateShortDe } from '../../lib/format';

const props = defineProps<{ series: PodcastSeries }>();
const { goBack } = useNavigation();
const audioStore = useAudioStore();
const membership = useMembershipStore();

function isCurrent(episode: PodcastEpisode): boolean {
  return audioStore.track?.episodeId === episode.id;
}

function play(episode: PodcastEpisode) {
  if (isCurrent(episode)) {
    audioStore.togglePlay();
    return;
  }
  const track = {
    title: episode.title,
    subtitle: `${props.series.title} · ${props.series.publisher}`,
    url: episode.audio,
    episodeId: episode.id,
  };
  // Bonus content: non-members listen to 60s, then the sheet extends an invitation
  if (episode.club && !membership.isMember) {
    audioStore.playPreview(track);
  } else {
    audioStore.playEpisode(track);
  }
}
</script>
