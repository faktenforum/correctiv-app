<template>
  <Label :text="label" class="rating-plaque" :class="plaqueClass" />
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { ratingLabel } from '../../services/article.service';

const props = defineProps<{ rating: string; ratingText?: string | null }>();

const label = computed(() => ratingLabel(props.rating, props.ratingText) ?? '');
const plaqueClass = computed(() => {
  const r = props.rating.replace(/_/g, '-');
  if (['false', 'mostly-false', 'manipulated'].includes(r)) return 'rating-plaque--false';
  if (['missing-context', 'misleading', 'unproven'].includes(r)) return 'rating-plaque--context';
  if (['true', 'mostly-true'].includes(r)) return 'rating-plaque--true';
  return 'rating-plaque--neutral';
});
</script>
