<template>
  <!-- Lives in AppShell Row 1 (outside the tab frames) so the native video
       surface survives navigation. Collapsed = bar above the tab bar; expanded
       = AppShell sets Row 0 to 0 so this fills the screen. The <ExoVideo> is the
       SAME element in both states — only its grid cell + size change. -->
  <GridLayout
    :rows="video.expanded ? `auto, ${expVideoH}, *` : '64'"
    :columns="video.expanded ? '*' : '104, *, auto'"
    class="uplayer"
    :class="video.expanded ? 'uplayer--expanded' : 'uplayer--bar hairline-top'"
  >
    <!-- Expanded header: minimieren + close -->
    <GridLayout v-if="video.expanded" row="0" col="0" columns="auto, *, auto" class="uplayer__header">
      <Label col="0" :text="icons.chevronLeft" class="lucide uplayer__icon" @tap="video.collapse()" />
      <Label col="1" text="Minimieren" class="uplayer__hint" @tap="video.collapse()" />
      <Label col="2" :text="icons.x" class="lucide uplayer__icon" @tap="video.close()" />
    </GridLayout>

    <!-- The ONE persistent video surface (never re-created → keeps playing). -->
    <ExoVideo
      v-if="video.hlsUrl"
      :row="video.expanded ? 1 : 0"
      col="0"
      :controls="video.expanded"
      :src="video.hlsUrl"
      :srcType="HLS_SRC_TYPE"
      :autoplay="true"
      class="uplayer__video"
    />
    <Label
      v-else
      :row="video.expanded ? 1 : 0"
      col="0"
      :text="video.status === 'error' ? 'Video nicht verfügbar' : 'Lädt …'"
      class="uplayer__loading"
      horizontalAlignment="center"
      verticalAlignment="center"
    />

    <!-- Collapsed bar: title + close (tap to expand) -->
    <StackLayout
      v-if="!video.expanded"
      row="0"
      col="1"
      verticalAlignment="center"
      class="uplayer__bartext"
      @tap="video.expand()"
    >
      <Label :text="video.current?.title" class="mini-player__title" :maxLines="1" />
      <Label text="FunFacts · Video" class="mini-player__subtitle" />
    </StackLayout>
    <Label
      v-if="!video.expanded"
      row="0"
      col="2"
      :text="icons.x"
      class="lucide mini-player__control"
      @tap="video.close()"
    />

    <!-- Expanded metadata -->
    <ScrollView v-if="video.expanded" row="2" col="0">
      <StackLayout class="px-sm py-s">
        <Label :text="video.current?.title" class="ty-headline-m text-grey-700" textWrap="true" />
        <Label :text="meta" class="ty-text-s text-grey-500 mt-xs" />
        <Label
          v-if="video.current?.description"
          :text="video.current?.description"
          class="ty-text-m text-grey-600 mt-s"
          textWrap="true"
        />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Screen } from '@nativescript/core';
import { icons } from '../../ui/icons';
import { useVideoStore } from '../../stores/video';
import { formatDateDe, formatTimeHm, formatNumberDe } from '../../lib/format';

const video = useVideoStore();

// ExoVideo srcType for an HLS (.m3u8) source.
const HLS_SRC_TYPE = 3;

// 16:9 video height for the expanded player (DIP).
const expVideoH = Math.round((Screen.mainScreen.widthDIPs * 9) / 16);

const meta = computed(() => {
  const v = video.current;
  if (!v) return '';
  return [
    'FunFacts',
    v.durationSec ? formatTimeHm(v.durationSec) : '',
    v.views != null ? `${formatNumberDe(v.views)} Aufrufe` : '',
    formatDateDe(v.publishedAt),
  ]
    .filter(Boolean)
    .join(' · ');
});
</script>
