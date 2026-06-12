<template>
  <!-- nativescript-vue 3 exportiert kein withModifiers — keine @tap.stop-Modifier verwenden -->
  <GridLayout columns="auto, *, auto, auto" class="mini-player hairline-top">
    <!-- Artwork bzw. Live-Punkt -->
    <GridLayout col="0" class="mini-player__artwork" verticalAlignment="center" @tap="openFullPlayer">
      <Label v-if="audioStore.isLive" text="●" class="mini-player__live-dot" />
      <Label v-else :text="icons.headphones" class="lucide mini-player__icon" />
    </GridLayout>

    <StackLayout col="1" verticalAlignment="center" class="mini-player__text" @tap="openFullPlayer">
      <Label :text="audioStore.track?.title" class="mini-player__title" />
      <Label
        :text="subtitle"
        class="mini-player__subtitle"
        :class="{ 'mini-player__subtitle--live': audioStore.isLive }"
      />
    </StackLayout>

    <Label
      col="2"
      :text="audioStore.status === 'playing' ? icons.pause : icons.play"
      class="lucide mini-player__control"
      @tap="audioStore.togglePlay()"
    />
    <Label col="3" :text="icons.x" class="lucide mini-player__control" @tap="audioStore.stop()" />
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useAudioStore } from '../../stores/audio';

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
  // PlayerModal folgt in M5 — der Mini-Player selbst ist der M1-Spike.
}
</script>
