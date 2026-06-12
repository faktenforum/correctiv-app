<template>
  <!-- One template for all project pages: badge header, description,
       live feed, project-specific action -->
  <Page actionBarHidden="true" @loaded="onLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" :text="project.name" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="pb-l">
          <StackLayout class="px-sm pt-m">
            <ProjectBadge :text="project.name" />
            <Label :text="project.description" class="ty-text-m text-grey-600 mt-s" textWrap="true" />
          </StackLayout>

          <!-- Project-specific action -->
          <StackLayout v-if="project.action === 'whatsapp-tip'" class="px-sm pt-s">
            <GridLayout columns="auto, *" class="hub-card" @tap="openWhatsApp">
              <Label col="0" :text="icons.messageCircle" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label text="Tipp an die Faktencheck-Redaktion" class="hub-card__title" textWrap="true" />
                <Label text="Verdächtige Behauptung per WhatsApp schicken" class="hub-card__teaser" textWrap="true" />
              </StackLayout>
            </GridLayout>
          </StackLayout>
          <StackLayout v-else-if="project.action === 'radio'" class="px-sm pt-s">
            <LiveBanner />
          </StackLayout>
          <StackLayout v-else-if="project.action === 'local-network'" class="px-sm pt-s">
            <GridLayout columns="auto, *" class="hub-card" @tap="openLokal">
              <Label col="0" :text="icons.users" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label text="Teil des Lokal-Netzwerks werden" class="hub-card__title" textWrap="true" />
                <Label text="Über 1.300 Lokaljournalist:innen arbeiten zusammen" class="hub-card__teaser" textWrap="true" />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <!-- Feed -->
          <template v-if="project.feed">
            <SectionHeader title="Neueste Beiträge" />
            <Label
              v-if="feedState.status === 'loading' || feedState.status === 'idle'"
              text="Wird geladen …"
              class="ty-text-s text-grey-600 px-sm"
            />
            <StackLayout v-for="item in feedState.items.slice(0, 12)" :key="item.id" class="list-pad">
              <ArticleCard :item="item" variant="standard" @open="openArticle" />
            </StackLayout>
          </template>

          <!-- Teaser-only (e.g. Europe with an empty feed) -->
          <StackLayout v-if="project.teaserOnly" class="card mx-sm mt-m">
            <Label text="Bald verfügbar" class="ty-headline-xs text-grey-700" />
            <Label
              :text="`${project.name} startet gerade — die ersten Inhalte erscheinen hier, sobald sie veröffentlicht sind.`"
              class="ty-text-s text-grey-600 mt-xs"
              textWrap="true"
            />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import type { FeedItem } from '../../types/models';
import type { Project } from '../../data/projects';
import ProjectBadge from '../../components/ui/ProjectBadge.vue';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import LiveBanner from '../../components/ui/LiveBanner.vue';
import ArticleCard from '../../components/cards/ArticleCard.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { useFeedsStore } from '../../stores/feeds';
import { useNavigation } from '../../composables/useNavigation';

const props = defineProps<{ project: Project }>();
const feeds = useFeedsStore();
const { navigate, goBack } = useNavigation();

const feedState = computed(() =>
  props.project.feed ? feeds.byKey[props.project.feed] : { items: [], status: 'idle' as const },
);

let loaded = false;
function onLoaded() {
  if (loaded) return;
  loaded = true;
  if (props.project.feed) feeds.fetch(props.project.feed);
}

function openArticle(item: FeedItem) {
  navigate(ArticleReaderPage, { props: { url: item.url, title: item.title } });
}
function openWhatsApp() {
  Utils.openUrl('https://wa.me/4915142647500');
}
function openLokal() {
  Utils.openUrl('https://correctiv.org/lokal/');
}
</script>
