<template>
  <!-- Early-Access: Countdown für Gäste, „Jetzt lesen" für Mitglieder (Status-Flip!) -->
  <StackLayout class="early-access-card" @tap="onTap">
    <GridLayout columns="auto, *" class="mb-xs">
      <ClubBadge col="0" />
      <Label
        col="1"
        :text="membership.isMember ? 'Für Sie schon jetzt' : `Für alle ab ${item.publicFromLabel}`"
        class="early-access-card__when"
      />
    </GridLayout>
    <Label :text="item.title" class="early-access-card__title" textWrap="true" />
    <Label :text="item.teaser" class="early-access-card__teaser" textWrap="true" :maxLines="3" />
    <GridLayout columns="auto, *" class="mt-s">
      <Label
        col="0"
        :text="membership.isMember ? 'Jetzt lesen' : countdownLabel"
        class="early-access-card__cta"
        :class="{ 'early-access-card__cta--member': membership.isMember }"
      />
    </GridLayout>
  </StackLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import type { EarlyAccessItem } from '../../data/backstage';
import ClubBadge from '../ui/ClubBadge.vue';
import { useMembershipStore } from '../../stores/membership';
import { useJoinFlow } from '../../composables/useJoinFlow';

const props = defineProps<{ item: EarlyAccessItem }>();
const emit = defineEmits<{ (e: 'read', articleUrl: string): void }>();

const membership = useMembershipStore();
const { openJoinFlow } = useJoinFlow();

const countdownLabel = computed(() => {
  const ms = new Date(props.item.publicFromIso).getTime() - Date.now();
  if (ms <= 0) return 'Jetzt für alle verfügbar';
  const days = Math.floor(ms / 864e5);
  const hours = Math.floor((ms % 864e5) / 36e5);
  const dayPart = days > 0 ? `${days} Tag${days === 1 ? '' : 'e'} ` : '';
  return `Clubmitglieder lesen jetzt — für alle in ${dayPart}${hours} Std.`;
});

function onTap() {
  if (membership.isMember) {
    emit('read', props.item.articleUrl);
  } else {
    openJoinFlow();
  }
}
</script>
