<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *, auto" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="2" :text="icons.externalLink" class="lucide reader-header__icon" @tap="openExternal" />
      </GridLayout>

      <!-- YouTube embed (nocookie); 16:9 -->
      <AWebView row="1" :src="embedUrl" class="video-embed" displayZoomControls="false" />

      <ScrollView row="2">
        <StackLayout class="px-sm py-s">
          <Label :text="video.title" class="ty-headline-m text-grey-700" textWrap="true" />
          <Label :text="meta" class="ty-text-s text-grey-500 mt-xs" />
          <Label v-if="video.description" :text="video.description" class="ty-text-m text-grey-600 mt-s" textWrap="true" />
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
import { formatDateDe } from '../../lib/format';

const props = defineProps<{ video: Video; channel?: string }>();
const { goBack } = useNavigation();

const embedUrl = computed(
  () => `https://www.youtube-nocookie.com/embed/${props.video.id}?playsinline=1&rel=0`,
);
const meta = computed(() => {
  const parts = [props.channel, formatDateDe(props.video.publishedAt)].filter(Boolean);
  return parts.join(' · ');
});

function openExternal() {
  Utils.openUrl(props.video.url);
}
</script>
