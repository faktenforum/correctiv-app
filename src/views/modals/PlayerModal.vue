<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *, auto" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s">
        <Label col="0" :text="icons.x" class="lucide reader-header__icon" @tap="$closeModal()" />
      </GridLayout>

      <StackLayout row="1" verticalAlignment="center" class="px-m">
        <GridLayout class="player__artwork">
          <Label
            :text="audioStore.isLive ? '●' : icons.headphones"
            class="player__artwork-icon"
            :class="{ 'player__artwork-icon--live': audioStore.isLive }"
          />
        </GridLayout>
        <Label :text="audioStore.track?.title" class="ty-headline-l text-grey-700 mt-m" textWrap="true" />
        <Label
          :text="audioStore.isLive ? '● LIVE — 24/7 aus Bottrop' : audioStore.track?.subtitle"
          class="ty-text-s mt-xs"
          :class="audioStore.isLive ? 'text-emphasis' : 'text-grey-600'"
          textWrap="true"
        />
      </StackLayout>

      <StackLayout row="2" class="px-m pb-m">
        <!-- Scrubber: replaced by a note when live -->
        <template v-if="!audioStore.isLive">
          <Slider
            :value="audioStore.positionSec"
            :maxValue="Math.max(audioStore.durationSec, 1)"
            minValue="0"
            class="player__slider"
            @valueChange="onSeek"
          />
          <GridLayout columns="auto, *, auto">
            <Label col="0" :text="formatTimeHm(audioStore.positionSec)" class="player__time" />
            <Label col="2" :text="formatTimeHm(audioStore.durationSec)" class="player__time" />
          </GridLayout>
        </template>
        <Label v-else text="Livestream — Salon5 sendet rund um die Uhr." class="ty-text-s text-grey-600 mb-s" textWrap="true" />

        <GridLayout columns="*, auto, *" class="mt-s">
          <Label
            v-if="!audioStore.isLive"
            col="0"
            :text="`${audioStore.speed}×`"
            class="player__speed"
            @tap="cycleSpeed"
          />
          <Label
            col="1"
            :text="audioStore.status === 'playing' ? icons.pause : icons.play"
            class="lucide player__play"
            @tap="audioStore.togglePlay()"
          />
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { $closeModal } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useAudioStore } from '../../stores/audio';
import { formatTimeHm } from '../../lib/format';

const audioStore = useAudioStore();

const SPEEDS = [1, 1.2, 1.5];

function cycleSpeed() {
  const next = SPEEDS[(SPEEDS.indexOf(audioStore.speed) + 1) % SPEEDS.length];
  audioStore.setSpeed(next);
}

let seekDebounce: ReturnType<typeof setTimeout> | null = null;
function onSeek(args: { value: number }) {
  // The slider also fires on programmatic updates — only seek on real jumps
  if (Math.abs(args.value - audioStore.positionSec) < 3) return;
  if (seekDebounce) clearTimeout(seekDebounce);
  seekDebounce = setTimeout(() => audioStore.seekTo(args.value), 200);
}
</script>
