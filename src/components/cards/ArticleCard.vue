<template>
  <!-- Variants: hero (large image on top), standard (image on the right), compact (text only) -->
  <GridLayout v-if="variant === 'hero'" rows="auto, auto" class="article-card article-card--hero" @tap="$emit('open', item)">
    <GridLayout row="0" class="article-card__image-wrap">
      <Image v-if="item.imageUrl" :src="item.imageUrl" stretch="aspectFill" class="article-card__hero-image" />
      <Label v-else text="" class="article-card__image-placeholder" />
    </GridLayout>
    <StackLayout row="1" class="article-card__body">
      <ProjectBadge v-if="badge" :text="badge" />
      <Label :text="item.title" class="article-card__hero-title" textWrap="true" />
      <Label v-if="item.teaser" :text="item.teaser" class="article-card__teaser" textWrap="true" :maxLines="3" />
      <Label :text="meta" class="article-card__meta" />
    </StackLayout>
  </GridLayout>

  <GridLayout v-else-if="variant === 'standard'" columns="*, auto" class="article-card hairline-bottom" @tap="$emit('open', item)">
    <StackLayout col="0" class="article-card__body--standard">
      <ProjectBadge v-if="badge" :text="badge" />
      <Label :text="item.title" class="article-card__title" textWrap="true" :maxLines="3" />
      <Label :text="meta" class="article-card__meta" />
    </StackLayout>
    <GridLayout col="1" class="article-card__thumb-wrap" verticalAlignment="top">
      <Image v-if="item.imageUrl" :src="item.imageUrl" stretch="aspectFill" class="article-card__thumb" />
      <Label v-else text="" class="article-card__thumb article-card__image-placeholder" />
    </GridLayout>
  </GridLayout>

  <StackLayout v-else class="article-card article-card--compact" @tap="$emit('open', item)">
    <Label :text="item.title" class="article-card__title--compact" textWrap="true" :maxLines="2" />
    <Label :text="meta" class="article-card__meta" />
  </StackLayout>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import type { FeedItem } from '../../types/models';
import ProjectBadge from '../ui/ProjectBadge.vue';
import { formatDateShortDe } from '../../lib/format';

const props = withDefaults(
  defineProps<{ item: FeedItem; variant?: 'hero' | 'standard' | 'compact'; badge?: string }>(),
  { variant: 'standard', badge: '' },
);
defineEmits<{ (e: 'open', item: FeedItem): void }>();

const meta = computed(() => {
  const dateText = formatDateShortDe(props.item.publishedAt);
  return props.item.author ? `${props.item.author} · ${dateText}` : dateText;
});
</script>
