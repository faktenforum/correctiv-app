<template>
  <GridLayout columns="auto, *, auto" class="live-banner" @tap="onTap">
    <Label col="0" text="●" class="live-banner__dot" verticalAlignment="center" />
    <StackLayout col="1" verticalAlignment="center" class="live-banner__text">
      <Label text="LIVE — Salon5 Radio" class="live-banner__title" />
      <Label text="24/7 aus Bottrop" class="live-banner__subtitle" />
    </StackLayout>
    <Label
      col="2"
      :text="isThisPlaying ? icons.pause : icons.play"
      class="lucide live-banner__play"
      verticalAlignment="center"
    />
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useAudioStore } from '../../stores/audio';

const audioStore = useAudioStore();
const isThisPlaying = computed(() => audioStore.isLive && audioStore.status === 'playing');

function onTap() {
  if (audioStore.isLive) {
    audioStore.togglePlay();
  } else {
    audioStore.playRadio();
  }
}
</script>
