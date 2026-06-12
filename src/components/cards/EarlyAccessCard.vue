<template>
  <!-- Early access: countdown for guests, "Jetzt lesen" for members (status flip!) -->
  <StackLayout class="early-access-card" @tap="onTap">
    <ClubBadge text="Club · Früher lesen" />
    <Label :text="item.title" class="early-access-card__title" textWrap="true" />
    <Label :text="item.teaser" class="early-access-card__teaser" textWrap="true" :maxLines="2" />
    <!-- Status flip: guests see the countdown + invitation, members a dark read button -->
    <template v-if="!membership.isMember">
      <Label :text="countdownLabel" class="early-access-card__when" textWrap="true" />
      <Label text="Unterstützer:in werden →" class="early-access-card__cta mt-s" />
    </template>
    <template v-else>
      <Label
        :text="`Für alle ab ${item.publicFromLabel} — Sie lesen jetzt schon.`"
        class="early-access-card__when"
        textWrap="true"
      />
      <Button text="Jetzt lesen" class="btn-dark btn-compact mt-s" horizontalAlignment="left" @tap="onTap" />
    </template>
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
  // Dative after "in": "in 1 Tag", "in 2 Tagen"
  const dayPart = days > 0 ? `${days} Tag${days === 1 ? '' : 'en'} ` : '';
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
