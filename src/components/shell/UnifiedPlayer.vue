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
    <!-- Expanded header: minimieren (left) + source badge (right), per design draft -->
    <GridLayout v-if="video.expanded" row="0" col="0" columns="auto, *, auto" class="uplayer__header">
      <StackLayout col="0" orientation="horizontal" class="uplayer__minimize" @tap="video.collapse()">
        <Label :text="icons.chevronDown" class="lucide uplayer__icon" verticalAlignment="center" />
        <Label text="Minimieren" class="uplayer__hint ml-xs" verticalAlignment="center" />
      </StackLayout>
      <Label col="2" text="PEERTUBE" class="uplayer__source-badge" verticalAlignment="center" />
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

    <!-- Expanded metadata (aligned to the design draft) -->
    <ScrollView v-if="video.expanded" row="2" col="0">
      <StackLayout class="uplayer__meta">
        <GridLayout columns="auto, *" class="uplayer__kicker-row">
          <Label col="0" :text="kicker" class="kicker" verticalAlignment="center" />
          <Label col="1" :text="episodeMeta" class="uplayer__episode ml-s" verticalAlignment="center" />
        </GridLayout>
        <Label :text="video.current?.title" class="uplayer__title" textWrap="true" />
        <Label :text="sourceMeta" class="uplayer__source hairline-bottom" textWrap="true" />
        <Label
          v-if="video.current?.description"
          :text="video.current?.description"
          class="uplayer__body"
          textWrap="true"
        />
        <GridLayout columns="auto, auto, *" class="uplayer__watch" @tap="openWatch">
          <Label col="0" :text="watchLabel" class="uplayer__watch-text" verticalAlignment="center" />
          <Label col="1" :text="icons.arrowUpRight" class="lucide uplayer__watch-icon ml-xs" verticalAlignment="center" />
        </GridLayout>
        <StackLayout class="uplayer__bande">
          <Label
            text="FunFacts läuft ohne Tracking und ohne Konzern — getragen von der Bande."
            class="uplayer__bande-text"
            textWrap="true"
          />
          <Label text="Teil der Bande werden" class="uplayer__bande-btn" @tap="openBande" />
        </StackLayout>
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Screen, Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import { useVideoStore } from '../../stores/video';
import { formatDateDe, formatMinutesDe, formatNumberDe } from '../../lib/format';

const video = useVideoStore();

// ExoVideo srcType for an HLS (.m3u8) source.
const HLS_SRC_TYPE = 3;

// 16:9 video height for the expanded player (DIP).
const expVideoH = Math.round((Screen.mainScreen.widthDIPs * 9) / 16);

const BANDE_JOIN_URL = 'https://bande.funfacts.de/join';

/** Whole days since publication — drives the freshness kicker + relative date. */
function daysSince(iso?: string): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}

/** Red kicker: brand-new episodes get "NEUE FOLGE", otherwise the channel name. */
const kicker = computed(() =>
  daysSince(video.current?.publishedAt) <= 7 ? 'NEUE FOLGE' : 'FUNFACTS',
);

/** Relative publish date + duration, e.g. "Heute · 15 Min." / "11. Juni · 16 Min." */
const episodeMeta = computed(() => {
  const v = video.current;
  if (!v) return '';
  const d = daysSince(v.publishedAt);
  const when = d <= 0 ? 'Heute' : d === 1 ? 'Gestern' : formatDateDe(v.publishedAt);
  const dur = v.durationSec ? formatMinutesDe(v.durationSec) : '';
  return [when, dur].filter(Boolean).join(' · ');
});

/** Source line under the title, e.g. "FunFacts · 5.628 Aufrufe". */
const sourceMeta = computed(() => {
  const v = video.current;
  const views = v?.views != null ? `${formatNumberDe(v.views)} Aufrufe` : '';
  return ['FunFacts', views].filter(Boolean).join(' · ');
});

/** External link label using the PeerTube host, e.g. "Auf tube.funfacts.de ansehen". */
const watchLabel = computed(() => {
  const host = (video.current?.url ?? '').replace(/^https?:\/\//, '').split('/')[0] || 'tube.funfacts.de';
  return `Auf ${host} ansehen`;
});

function openWatch() {
  if (video.current?.url) Utils.openUrl(video.current.url);
}

function openBande() {
  Utils.openUrl(BANDE_JOIN_URL);
}
</script>
