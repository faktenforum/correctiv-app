<template>
  <Label :text="label" class="rating-plaque" :class="plaqueClass" />
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { ratingLabel, ratingTone } from '@correctiv/app-core/articles/rating';
import type { FactcheckRating } from '@correctiv/app-core/articles/types';

/**
 * The label and the tone both come from the core, so this plaque, the reader's
 * plaque and a Faktenforum claim tag can never disagree about what a verdict is
 * called or which colour it gets.
 */
const props = defineProps<{ rating: FactcheckRating }>();

const label = computed(() => ratingLabel(props.rating));
const plaqueClass = computed(() => `rating-plaque--${ratingTone(props.rating)}`);
</script>
