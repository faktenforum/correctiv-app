<template>
  <Page actionBarHidden="true" @loaded="onLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <TextField
          ref="searchField"
          col="1"
          v-model="query"
          hint="Suchen …"
          returnKeyType="search"
          class="search-field ml-s"
        />
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="py-s pb-l">
          <Label
            v-if="trimmedQuery.length < 2"
            text="Suchen Sie über Recherchen, Faktenchecks, Projekte, Podcasts und Mitmach-Aktionen."
            class="ty-text-m text-grey-600 px-sm py-s"
            textWrap="true"
          />
          <template v-else>
            <!-- Live feed hits -->
            <SectionHeader v-if="articleHits.length > 0" title="Artikel" />
            <StackLayout v-for="item in articleHits" :key="item.id" class="list-pad">
              <ArticleCard :item="item" variant="compact" @open="openArticle" />
            </StackLayout>

            <!-- Sample hits (podcasts, callouts, backstage, publisher) -->
            <SectionHeader v-if="sampleHits.length > 0" title="Aus den Projekten" />
            <GridLayout
              v-for="hit in sampleHits"
              :key="hit.id"
              columns="auto, *"
              class="px-sm py-s hairline-bottom"
              @tap="openSample(hit)"
            >
              <Label col="0" :text="sampleIcon(hit.kind)" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label :text="hit.title" class="ty-text-m font-sans-semibold text-grey-700" textWrap="true" />
                <Label :text="hit.subtitle" class="ty-text-s text-grey-500" />
              </StackLayout>
            </GridLayout>

            <Label
              v-if="articleHits.length === 0 && sampleHits.length === 0"
              :text="`Keine Treffer für „${trimmedQuery}“.`"
              class="ty-text-m text-grey-600 px-sm py-s"
              textWrap="true"
            />
          </template>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import type { FeedItem } from '../../types/models';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import ArticleCard from '../../components/cards/ArticleCard.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { searchSamples, type SearchSample } from '../../data/search-samples';
import { useFeedsStore } from '../../stores/feeds';
import { useNavigation } from '../../composables/useNavigation';
import type { FeedKey } from '../../types/models';

const feeds = useFeedsStore();
const { navigate, navigateInTab, goBack } = useNavigation();

const query = ref('');
const trimmedQuery = computed(() => query.value.trim());

const ALL_FEEDS: FeedKey[] = ['recherchen', 'faktencheck', 'klima', 'schweiz', 'lokal', 'salon5'];

let loaded = false;
function onLoaded() {
  if (loaded) return;
  loaded = true;
  // Search runs over everything already loaded; warm up the remaining feeds
  for (const key of ALL_FEEDS) feeds.fetch(key);
}

function matches(text: string): boolean {
  return text.toLowerCase().includes(trimmedQuery.value.toLowerCase());
}

const articleHits = computed((): FeedItem[] => {
  if (trimmedQuery.value.length < 2) return [];
  const seen = new Set<string>();
  const hits: FeedItem[] = [];
  for (const key of ALL_FEEDS) {
    for (const item of feeds.byKey[key].items) {
      if (seen.has(item.url)) continue;
      if (matches(item.title) || matches(item.teaser)) {
        seen.add(item.url);
        hits.push(item);
      }
    }
  }
  return hits.slice(0, 12);
});

const sampleHits = computed((): SearchSample[] => {
  if (trimmedQuery.value.length < 2) return [];
  return searchSamples.filter((s) => matches(s.title) || matches(s.subtitle));
});

function sampleIcon(kind: SearchSample['kind']): string {
  switch (kind) {
    case 'podcast': return icons.headphones;
    case 'callout': return icons.megaphone;
    case 'backstage': return icons.sparkles;
    case 'verlag': return icons.fileText;
    default: return icons.compass;
  }
}

function openArticle(item: FeedItem) {
  navigate(ArticleReaderPage, { props: { url: item.url, title: item.title } });
}

function openSample(hit: SearchSample) {
  // Cross-jump to the owning area of the app
  if (hit.kind === 'podcast') {
    navigateInTab('media');
  } else if (hit.kind === 'callout') {
    navigateInTab('participate');
  } else if (hit.kind === 'backstage') {
    navigateInTab('profile');
  }
}
</script>
