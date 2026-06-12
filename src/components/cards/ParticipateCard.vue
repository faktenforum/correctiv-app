<template>
  <!-- Participate card on Home — participation is a core promise, placed prominently -->
  <StackLayout class="participate-card" @tap="$emit('open')">
    <Label text="MITMACHEN" class="participate-card__kicker" />
    <Label :text="title" class="participate-card__title" textWrap="true" />
    <Label :text="teaser" class="participate-card__teaser" textWrap="true" :maxLines="2" />
    <GridLayout columns="auto, auto" class="mt-s">
      <Label col="0" :text="icons.users" class="lucide participate-card__count-icon" />
      <Label col="1" :text="countLabel" class="participate-card__count" />
    </GridLayout>
  </StackLayout>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';

defineProps<{ title: string; teaser: string; countLabel: string }>();
defineEmits<{ (e: 'open'): void }>();
</script>
