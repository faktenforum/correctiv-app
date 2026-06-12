<template>
  <!-- nativescript-vue 3 does not export withModifiers — do not use @tap.stop modifiers -->
  <GridLayout columns="auto, *, auto" class="mini-player hairline-top">
    <!-- Round red play/pause button (design draft) -->
    <GridLayout col="0" class="mini-player__button" verticalAlignment="center" @tap="audioStore.togglePlay()">
      <Label
        :text="audioStore.status === 'playing' ? icons.pause : icons.play"
        class="lucide mini-player__button-icon"
      />
    </GridLayout>

    <StackLayout col="1" verticalAlignment="center" class="mini-player__text" @tap="openFullPlayer">
      <Label :text="audioStore.track?.title" class="mini-player__title" />
      <Label
        :text="subtitle"
        class="mini-player__subtitle"
        :class="{ 'mini-player__subtitle--live': audioStore.isLive }"
      />
    </StackLayout>

    <Label col="2" :text="icons.x" class="lucide mini-player__control" @tap="audioStore.stop()" />
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { $showModal } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useAudioStore } from '../../stores/audio';
import PlayerModal from '../../views/modals/PlayerModal.vue';

const audioStore = useAudioStore();

const subtitle = computed(() => {
  if (audioStore.status === 'loading') return 'Lädt …';
  if (audioStore.status === 'error') return audioStore.errorMessage ?? 'Fehler';
  if (audioStore.isLive) return audioStore.track?.subtitle ?? '● LIVE';
  const pos = formatTime(audioStore.positionSec);
  const dur = audioStore.durationSec > 0 ? ` / ${formatTime(audioStore.durationSec)}` : '';
  return `${pos}${dur}`;
});

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function openFullPlayer() {
  $showModal(PlayerModal, { fullscreen: true });
}
</script>
