<template>
  <StackLayout class="spotlight-card">
    <GridLayout columns="auto, *" class="mb-xs">
      <Label col="0" text="SPOTLIGHT" class="spotlight-card__brand" />
      <Label col="1" :text="dateLabel" class="spotlight-card__date" />
    </GridLayout>
    <StackLayout v-for="entry in issue.items" :key="entry.title" class="spotlight-card__item" @tap="open(entry)">
      <GridLayout columns="auto, *">
        <Label col="0" :text="entry.time" class="spotlight-card__time" />
        <Label col="1" :text="entry.title" class="spotlight-card__title" textWrap="true" />
      </GridLayout>
      <Label :text="entry.text" class="spotlight-card__text" textWrap="true" />
    </StackLayout>
  </StackLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import type { SpotlightIssue, SpotlightItem } from '../../data/spotlight';
import { formatDateShortDe } from '../../lib/format';

const props = defineProps<{ issue: SpotlightIssue }>();
const emit = defineEmits<{ (e: 'open', articleUrl: string): void }>();

const dateLabel = computed(() => formatDateShortDe(props.issue.date));

function open(entry: SpotlightItem) {
  if (entry.articleUrl) emit('open', entry.articleUrl);
}
</script>
