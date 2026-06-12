<template>
  <!-- Global overlay (AppShell): appears when the 60s preview ends.
       Invitation, never a lock — content stays visible, nothing gets blocked. -->
  <GridLayout rows="*, auto" class="sheet-overlay" @tap="dismiss">
    <StackLayout row="1" class="sheet" @tap="() => {}">
      <Label text="" class="sheet__handle" />
      <ClubBadge />
      <Label
        text="Ganze Folge hören? Werden Sie Teil des Clubs."
        class="ty-headline-l text-grey-700 font-serif-bold mt-s"
        textWrap="true"
      />
      <Label
        text="Die ersten 60 Sekunden gehören allen. Der Rest ist unser Dankeschön an die Menschen, die CORRECTIV möglich machen."
        class="ty-text-m text-grey-600 mt-xs"
        textWrap="true"
      />
      <Button text="Unterstützer:in werden" class="btn-primary mt-m" @tap="join" />
      <Button text="Später" class="btn-secondary mt-s mb-s" @tap="dismiss" />
    </StackLayout>
  </GridLayout>
</template>

<script setup lang="ts">
import ClubBadge from '../ui/ClubBadge.vue';
import { useAudioStore } from '../../stores/audio';
import { useJoinFlow } from '../../composables/useJoinFlow';

const audioStore = useAudioStore();
const { openJoinFlow } = useJoinFlow();

function dismiss() {
  audioStore.acknowledgePreviewEnd();
}

function join() {
  audioStore.acknowledgePreviewEnd();
  openJoinFlow();
}
</script>
