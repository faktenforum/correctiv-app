<template>
  <StackLayout class="media-card" @tap="$emit('open')">
    <GridLayout class="media-card__thumb-wrap">
      <RemoteImage :url="thumbnail" kind="video" class="media-card__thumb" />
      <Label :text="icons.circlePlay" class="lucide media-card__play" />
      <Label v-if="durationLabel" :text="durationLabel" class="media-card__duration" />
    </GridLayout>
    <ClubBadge v-if="club" class="mt-xs" />
    <Label :text="title" class="media-card__title" textWrap="true" :maxLines="2" />
    <Label v-if="subtitle" :text="subtitle" class="media-card__subtitle" textWrap="true" :maxLines="1" />
  </StackLayout>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import ClubBadge from '../ui/ClubBadge.vue';
import RemoteImage from '../ui/RemoteImage.vue';

withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    thumbnail?: string;
    durationLabel?: string;
    club?: boolean;
  }>(),
  { subtitle: '', thumbnail: '', durationLabel: '', club: false },
);
defineEmits<{ (e: 'open'): void }>();
</script>
