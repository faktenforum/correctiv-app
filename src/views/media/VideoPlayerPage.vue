<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, auto, *" class="bg-grey-100">
      <!-- Header: back (left) + source badge (right), matching the unified player -->
      <GridLayout row="0" columns="auto, *, auto" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="2" text="YOUTUBE" class="uplayer__source-badge" verticalAlignment="center" />
      </GridLayout>

      <!-- YouTube embed (nocookie); 16:9 -->
      <AWebView row="1" :src="embedUrl" class="video-embed" displayZoomControls="false" />

      <!-- Metadata reuses the unified-player styles so both players look identical -->
      <ScrollView row="2">
        <StackLayout class="uplayer__meta">
          <GridLayout columns="auto, *" class="uplayer__kicker-row">
            <Label col="0" :text="kicker" class="kicker" verticalAlignment="center" />
            <Label col="1" :text="dateLabel" class="uplayer__episode ml-s" verticalAlignment="center" />
          </GridLayout>
          <Label :text="video.title" class="uplayer__title" textWrap="true" />
          <Label v-if="channel" :text="channel" class="uplayer__source hairline-bottom" textWrap="true" />
          <Label
            v-if="video.description"
            :text="video.description"
            class="uplayer__body"
            textWrap="true"
          />
          <GridLayout columns="auto, auto, *" class="uplayer__watch" @tap="openExternal">
            <Label col="0" text="Auf YouTube ansehen" class="uplayer__watch-text" verticalAlignment="center" />
            <Label col="1" :text="icons.arrowUpRight" class="lucide uplayer__watch-icon ml-xs" verticalAlignment="center" />
          </GridLayout>
          <StackLayout class="uplayer__bande">
            <Label
              text="CORRECTIV ist gemeinnützig und werbefrei — unser Journalismus bleibt für alle frei zugänglich."
              class="uplayer__bande-text"
              textWrap="true"
            />
            <Label text="Unterstützer:in werden" class="uplayer__bande-btn" @tap="openJoinFlow()" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import type { Video } from '../../types/models';
import { useNavigation } from '../../composables/useNavigation';
import { useJoinFlow } from '../../composables/useJoinFlow';
import { formatDateDe } from '../../lib/format';

const props = defineProps<{ video: Video; channel?: string }>();
const { goBack } = useNavigation();
const { openJoinFlow } = useJoinFlow();

const embedUrl = computed(
  () => `https://www.youtube-nocookie.com/embed/${props.video.id}?playsinline=1&rel=0`,
);

/** Whole days since publication — drives the freshness kicker + relative date. */
function daysSince(iso?: string): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}

/** Red kicker: brand-new uploads get "NEUE FOLGE", otherwise a neutral marker. */
const kicker = computed(() => (daysSince(props.video.publishedAt) <= 7 ? 'NEUE FOLGE' : 'VIDEO'));

/** Relative publish date (YouTube's Atom feed carries no duration/views). */
const dateLabel = computed(() => {
  const d = daysSince(props.video.publishedAt);
  return d <= 0 ? 'Heute' : d === 1 ? 'Gestern' : formatDateDe(props.video.publishedAt);
});

function openExternal() {
  Utils.openUrl(props.video.url);
}
</script>
