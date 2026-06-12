<template>
  <Page actionBarHidden="true" @loaded="onLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" text="CORRECTIV" class="brand" />
        <Label col="1" :text="todayLabel" class="home-date" verticalAlignment="center" />
      </GridLayout>

      <CollectionView row="1" :items="modules" :itemTemplateSelector="templateSelector">
        <!-- 1. Hero: top investigation (LIVE) — flat, directly below the header -->
        <template #hero="{ item }">
          <ArticleCard :item="item.article" variant="hero" badge="Recherche" @open="openArticle" />
        </template>

        <!-- 2. Spotlight briefing (SAMPLE) -->
        <template #briefing="{ item }">
          <StackLayout>
            <SectionHeader title="Das Wichtigste heute" action="Alle Ausgaben" @action="openSpotlight" />
            <SpotlightBriefing :issue="item.issue" @open="openUrl" />
          </StackLayout>
        </template>

        <!-- 3. Early access (status-flip demo) -->
        <template #earlyAccess="{ item }">
          <StackLayout class="pt-m">
            <EarlyAccessCard :item="item.earlyAccess" @read="openUrl" />
          </StackLayout>
        </template>

        <!-- 4. Latest investigations (LIVE) -->
        <template #sectionRecherchen>
          <SectionHeader title="Neueste Recherchen" />
        </template>
        <template #sectionInterest="{ item }">
          <SectionHeader :title="item.title" />
        </template>
        <template #default="{ item }">
          <StackLayout class="list-pad">
            <ArticleCard :item="item.article" variant="standard" :badge="item.badge" @open="openArticle" />
          </StackLayout>
        </template>

        <!-- 5. Fact-check rail (LIVE, horizontal) — ScrollView instead of nested
             CollectionView: the latter crashes in recycled cells (viewClass error) -->
        <template #factcheckRail="{ item }">
          <StackLayout>
            <SectionHeader title="Faktencheck" />
            <ScrollView orientation="horizontal" class="factcheck-rail">
              <StackLayout orientation="horizontal">
                <StackLayout
                  v-for="check in item.factchecks"
                  :key="check.id"
                  class="factcheck-rail-card"
                  @tap="openArticle(check)"
                >
                  <ProjectBadge text="Faktencheck" />
                  <Label :text="check.title" class="factcheck-rail-card__title" textWrap="true" :maxLines="4" />
                  <Label :text="check.teaser" class="factcheck-rail-card__teaser" textWrap="true" :maxLines="3" />
                </StackLayout>
              </StackLayout>
            </ScrollView>
          </StackLayout>
        </template>

        <!-- 6. Participate card (SAMPLE → tab 4) -->
        <template #participate="{ item }">
          <StackLayout class="pt-m">
            <ParticipateCard
              :title="item.callout.title"
              :teaser="item.callout.excerpt"
              :countLabel="`${formatNumberDe(item.callout.responseCount)} Beiträge bisher`"
              @open="goToParticipate"
            />
          </StackLayout>
        </template>

        <!-- 7. Media row: video of the day + radio (LIVE) -->
        <template #mediaRow="{ item }">
          <StackLayout>
            <SectionHeader title="Mediathek" action="Alles ansehen" @action="goToMedia" />
            <ScrollView orientation="horizontal" class="media-row">
              <StackLayout orientation="horizontal">
                <MediaCard
                  v-if="item.video"
                  :title="item.video.title"
                  subtitle="FunFacts · Video des Tages"
                  :thumbnail="item.video.thumbnailUrl"
                  @open="openVideo(item.video)"
                />
                <LiveBanner class="media-row-radio" />
              </StackLayout>
            </ScrollView>
          </StackLayout>
        </template>

        <!-- 8. Backstage module (SAMPLE) -->
        <template #backstage="{ item }">
          <StackLayout class="pt-m">
            <BackstageTile
              :diaryTitle="item.diary.title"
              :diaryTeaser="item.diary.teaser"
              :bonusTitle="item.bonus.title"
              @open="goToBackstage"
            />
          </StackLayout>
        </template>

        <!-- 9. Impact footer -->
        <template #impact>
          <ImpactFooter />
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
import { Utils } from '@nativescript/core';
import type { FeedItem, Video } from '../../types/models';
import ArticleCard from '../../components/cards/ArticleCard.vue';
import SpotlightBriefing from '../../components/cards/SpotlightBriefing.vue';
import EarlyAccessCard from '../../components/cards/EarlyAccessCard.vue';
import ParticipateCard from '../../components/cards/ParticipateCard.vue';
import MediaCard from '../../components/cards/MediaCard.vue';
import BackstageTile from '../../components/cards/BackstageTile.vue';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import ProjectBadge from '../../components/ui/ProjectBadge.vue';
import LiveBanner from '../../components/ui/LiveBanner.vue';
import ImpactFooter from '../../components/ui/ImpactFooter.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import SpotlightReaderPage from '../reader/SpotlightReaderPage.vue';
import BackstagePage from '../backstage/BackstagePage.vue';
import { useFeedsStore } from '../../stores/feeds';
import { useMediaStore } from '../../stores/media';
import { useInterestsStore } from '../../stores/interests';
import { useNavigation } from '../../composables/useNavigation';
import { spotlightIssues } from '../../data/spotlight';
import { earlyAccess, diaries, bonusMedia } from '../../data/backstage';
import { callouts } from '../../data/callouts';
import { formatNumberDe, formatDateWeekdayDe } from '../../lib/format';

interface HomeModule {
  id: string;
  kind: string;
  [key: string]: unknown;
}

const feeds = useFeedsStore();
const media = useMediaStore();
const interestsStore = useInterestsStore();
const { navigate, navigateInTab } = useNavigation();

const todayLabel = formatDateWeekdayDe(new Date());

const modules = computed((): HomeModule[] => {
  const recherchen = feeds.byKey.recherchen;
  const result: HomeModule[] = [];

  if (recherchen.status === 'loading' || recherchen.status === 'idle') {
    return [{ id: 'status', kind: 'status', text: 'Aktuelle Recherchen werden geladen …' }];
  }
  if (recherchen.status === 'offline') {
    result.push({ id: 'offline', kind: 'status', text: 'Offline — gebündelte Inhalte werden angezeigt.' });
  }

  const articles = recherchen.items;
  if (articles[0]) result.push({ id: 'hero', kind: 'hero', article: articles[0] });

  result.push({ id: 'briefing', kind: 'briefing', issue: spotlightIssues[0] });
  result.push({ id: 'early', kind: 'earlyAccess', earlyAccess });

  if (articles.length > 1) {
    result.push({ id: 'sec-recherchen', kind: 'sectionRecherchen' });
    for (const article of articles.slice(1, 5)) {
      result.push({ id: article.id, kind: 'article', article, badge: '' });
    }
  }

  const factchecks = feeds.byKey.faktencheck.items.slice(0, 8);
  const railModule: HomeModule | null =
    factchecks.length > 0 ? { id: 'rail', kind: 'factcheckRail', factchecks } : null;
  const video = media.byKey.funfacts.videos[0] ?? null;
  const mediaModule: HomeModule = { id: 'mediaRow', kind: 'mediaRow', video };

  // Personalization (onboarding): selected interests move modules up
  const boosted = interestsStore.boostedModules;
  if (railModule && boosted.includes('factcheckRail')) {
    result.splice(result.findIndex((m) => m.id === 'sec-recherchen'), 0, railModule);
  }
  if (boosted.includes('mediaRow')) {
    const anchor = result.findIndex((m) => m.id === 'sec-recherchen');
    result.splice(anchor >= 0 ? anchor : result.length, 0, { ...mediaModule, id: 'mediaRow-boost' });
  }

  if (railModule && !boosted.includes('factcheckRail')) result.push(railModule);

  // Additional sections from interest feeds (Klima, Lokal, Schweiz)
  for (const interest of interestsStore.extraFeeds) {
    const feedItems = feeds.byKey[interest.feed!].items.slice(0, 2);
    if (feedItems.length > 0) {
      result.push({ id: `sec-${interest.id}`, kind: 'sectionInterest', title: interest.label });
      for (const article of feedItems) {
        result.push({ id: `${interest.id}-${article.id}`, kind: 'article', article, badge: interest.label });
      }
    }
  }

  result.push({ id: 'participate', kind: 'participate', callout: callouts[0] });
  if (!boosted.includes('mediaRow')) result.push(mediaModule);

  result.push({ id: 'backstage', kind: 'backstage', diary: diaries[0], bonus: bonusMedia[0] });
  result.push({ id: 'impact', kind: 'impact' });

  return result;
});

function templateSelector(item: HomeModule): string {
  const map: Record<string, string> = {
    hero: 'hero',
    briefing: 'briefing',
    earlyAccess: 'earlyAccess',
    sectionRecherchen: 'sectionRecherchen',
    sectionInterest: 'sectionInterest',
    article: 'default',
    factcheckRail: 'factcheckRail',
    participate: 'participate',
    mediaRow: 'mediaRow',
    backstage: 'backstage',
    impact: 'impact',
    status: 'status',
  };
  return map[item.kind] ?? 'default';
}

let loaded = false;
async function onLoaded() {
  if (loaded) return;
  loaded = true;
  await Promise.all([feeds.fetch('recherchen'), feeds.fetch('faktencheck'), media.fetch('funfacts')]);
  // Load interest feeds afterwards (personalization)
  for (const interest of interestsStore.extraFeeds) {
    feeds.fetch(interest.feed!);
  }
  for (const item of feeds.byKey.recherchen.items.slice(0, 5)) {
    feeds.enrichImage('recherchen', item.id);
  }
}

function openArticle(article: FeedItem) {
  navigate(ArticleReaderPage, { props: { url: article.url, title: article.title } });
}

function openUrl(url: string) {
  navigate(ArticleReaderPage, { props: { url } });
}

function openVideo(video: Video) {
  // VideoPlayerPage follows in M5 — open externally until then
  Utils.openUrl(video.url);
}

function goToParticipate() {
  navigateInTab('participate');
}

function goToMedia() {
  navigateInTab('media');
}

function openSpotlight() {
  navigate(SpotlightReaderPage);
}

function goToBackstage() {
  navigate(BackstagePage);
}
</script>
