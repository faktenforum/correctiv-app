<template>
  <!-- Remote image with a styled placeholder tile (like the podcast covers).
       The placeholder shows until the image arrives — and stays if it never
       does. Order of preference: cached/loaded remote image → bundled local
       cover (offline fallback) → placeholder tile. Local/bundled paths
       (~/…) render directly. Size and radius come from the parent's class. -->
  <GridLayout>
    <Image v-if="directLocal" :src="directLocal" :stretch="stretch" />
    <Image v-else-if="source" :src="source" :stretch="stretch" />
    <Image v-else-if="fallbackCover" :src="fallbackCover" :stretch="stretch" />
    <GridLayout v-else class="remote-image__placeholder" :class="`remote-image__placeholder--${kind}`">
      <Label v-if="placeholderIcon" :text="placeholderIcon" class="lucide remote-image__icon" />
    </GridLayout>
  </GridLayout>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'nativescript-vue';
import type { ImageSource } from '@nativescript/core';
import { icons } from '../../ui/icons';
import { getCachedRemoteImage, loadRemoteImage, localCoverFor } from '../../services/image.service';

const props = withDefaults(
  defineProps<{
    url?: string | null;
    /** Article URL — used to look up a bundled local cover as offline fallback. */
    articleUrl?: string | null;
    /** Placeholder style: articles get a light tile with a newspaper icon,
        videos a dark tile (callers overlay their own play glyph). */
    kind?: 'article' | 'video';
    stretch?: string;
  }>(),
  { url: '', articleUrl: '', kind: 'article', stretch: 'aspectFill' },
);

const source = shallowRef<ImageSource | null>(null);
const isRemote = (url?: string | null): boolean => !!url && /^https?:\/\//.test(url);
// A local/bundled path passed straight as url (~/… or file://)
const directLocal = computed(() => (props.url && !isRemote(props.url) ? props.url : null));
// Bundled cover used when the remote image is absent or unreachable (offline)
const fallbackCover = computed(() => (props.articleUrl ? localCoverFor(props.articleUrl) : null));
const placeholderIcon = computed(() => (props.kind === 'video' ? '' : icons.newspaper));

// `immediate` also covers recycled CollectionView cells re-binding the url
watch(
  () => props.url,
  (url) => {
    source.value = isRemote(url) ? getCachedRemoteImage(url!) : null;
    if (!isRemote(url) || source.value) return;
    loadRemoteImage(url!).then((loaded) => {
      if (props.url === url && loaded) source.value = loaded;
    });
  },
  { immediate: true },
);
</script>
