<template>
  <!-- Backstage module on Home: diary + bonus episode teased, never locked away -->
  <StackLayout class="backstage-tile" @tap="$emit('open')">
    <GridLayout columns="auto, *" class="mb-xs">
      <ClubBadge col="0" text="BACKSTAGE" />
    </GridLayout>
    <Label :text="diaryTitle" class="backstage-tile__title" textWrap="true" />
    <Label :text="diaryTeaser" class="backstage-tile__teaser" textWrap="true" :maxLines="2" />
    <GridLayout columns="auto, *" class="backstage-tile__bonus mt-s">
      <Label col="0" :text="icons.headphones" class="lucide backstage-tile__bonus-icon" />
      <Label col="1" :text="bonusTitle" class="backstage-tile__bonus-title" textWrap="true" :maxLines="2" />
    </GridLayout>
    <Label text="Alles aus Backstage →" class="backstage-tile__link mt-s" />
  </StackLayout>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import ClubBadge from '../ui/ClubBadge.vue';

defineProps<{ diaryTitle: string; diaryTeaser: string; bonusTitle: string }>();
defineEmits<{ (e: 'open'): void }>();
</script>
