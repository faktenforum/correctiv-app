<template>
  <!-- Variants: hero (large image on top), standard (image on the right), compact (text only) -->
  <!-- Hero: flat and edge-to-edge with red text kicker (design draft) -->
  <StackLayout v-if="variant === 'hero'" class="article-card article-card--hero" @tap="$emit('open', item)">
    <GridLayout class="article-card__image-wrap">
      <Image v-if="item.imageUrl" :src="item.imageUrl" stretch="aspectFill" class="article-card__hero-image" />
      <Label v-else text="" class="article-card__image-placeholder" />
    </GridLayout>
    <StackLayout class="article-card__body hairline-bottom">
      <Label v-if="badge" :text="badge" class="kicker" />
      <Label :text="item.title" class="article-card__hero-title" textWrap="true" />
      <Label v-if="item.teaser" :text="item.teaser" class="article-card__teaser" textWrap="true" :maxLines="3" />
      <Label :text="meta" class="article-card__meta" />
    </StackLayout>
  </StackLayout>

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
