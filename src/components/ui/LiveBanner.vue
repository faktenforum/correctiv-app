<template>
  <GridLayout columns="auto, *" class="live-banner" @tap="onTap">
    <!-- Round red play/pause button (design draft) -->
    <GridLayout col="0" class="live-banner__button" verticalAlignment="center">
      <Label :text="isThisPlaying ? icons.pause : icons.play" class="lucide live-banner__button-icon" />
    </GridLayout>
    <StackLayout col="1" verticalAlignment="center" class="live-banner__text">
      <GridLayout columns="auto, auto">
        <Label col="0" text="●" class="live-banner__dot" verticalAlignment="center" />
        <Label col="1" text="LIVE" class="live-banner__live-label" verticalAlignment="center" />
      </GridLayout>
      <Label text="Salon5 Radio" class="live-banner__title" />
      <Label :text="subtitle" class="live-banner__subtitle" textWrap="true" :maxLines="2" />
    </StackLayout>
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useAudioStore } from '../../stores/audio';

withDefaults(defineProps<{ subtitle?: string }>(), { subtitle: '24/7 aus Bottrop' });

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
