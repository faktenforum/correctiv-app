<template>
  <!-- M2: provisorische Live-Liste; das vollständige Home-Modul-Layout folgt in M3 -->
  <Page actionBarHidden="true" @loaded="onLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>

      <CollectionView
        row="1"
        :items="listItems"
        :itemTemplateSelector="templateSelector"
      >
        <template #hero="{ item }">
          <StackLayout class="pt-sm">
            <ArticleCard :item="item.article" variant="hero" :badge="item.badge" @open="openArticle" />
          </StackLayout>
        </template>
        <template #default="{ item }">
          <StackLayout class="list-pad">
            <ArticleCard :item="item.article" variant="standard" :badge="item.badge" @open="openArticle" />
          </StackLayout>
        </template>
        <template #status="{ item }">
          <Label :text="item.text" class="ty-text-s text-grey-600 list-pad py-s" textWrap="true" />
        </template>
      </CollectionView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import type { FeedItem } from '../../types/models';
import ArticleCard from '../../components/cards/ArticleCard.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { useFeedsStore } from '../../stores/feeds';
import { useNavigation } from '../../composables/useNavigation';

interface HomeListItem {
  id: string;
  kind: 'hero' | 'article' | 'status';
  article?: FeedItem;
  badge?: string;
  text?: string;
}

const feeds = useFeedsStore();
const { navigate } = useNavigation();

const listItems = computed((): HomeListItem[] => {
  const feedState = feeds.byKey.recherchen;
  if (feedState.status === 'loading' || feedState.status === 'idle') {
    return [{ id: 'status', kind: 'status', text: 'Aktuelle Recherchen werden geladen …' }];
  }
  if (feedState.status === 'error') {
    return [{ id: 'status', kind: 'status', text: 'Recherchen konnten nicht geladen werden.' }];
  }
  const items: HomeListItem[] = feedState.items.slice(0, 15).map((article, index) => ({
    id: article.id,
    kind: index === 0 ? 'hero' : 'article',
    article,
    badge: index === 0 ? 'Recherche' : badgeFor(article),
  }));
  if (feedState.status === 'offline') {
    items.unshift({ id: 'status', kind: 'status', text: 'Offline — gebündelte Artikel werden angezeigt.' });
  }
  return items;
});

function badgeFor(article: FeedItem): string {
  return article.url.includes('/faktencheck/') ? 'Faktencheck' : '';
}

function templateSelector(item: HomeListItem): string {
  if (item.kind === 'hero') return 'hero';
  if (item.kind === 'status') return 'status';
  return 'default';
}

let loaded = false;
async function onLoaded() {
  if (loaded) return;
  loaded = true;
  await feeds.fetch('recherchen');
  // Titelbilder der ersten Artikel nachladen (Hero + Top 4)
  for (const item of feeds.byKey.recherchen.items.slice(0, 5)) {
    feeds.enrichImage('recherchen', item.id);
  }
}

function openArticle(article: FeedItem) {
  navigate(ArticleReaderPage, { props: { url: article.url, title: article.title } });
}
</script>
