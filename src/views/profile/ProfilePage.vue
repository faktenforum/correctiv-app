<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="pb-l">
          <Label text="Profil" class="ty-headline-xl text-grey-700 px-sm pt-m" textWrap="true" />

          <!-- Header: guest vs yellow club card -->
          <StackLayout v-if="membership.isMember" class="club-card mx-sm mt-s">
            <GridLayout columns="*, auto">
              <Label col="0" text="CORRECTIV CLUB" class="club-card__brand" />
              <Label col="1" :text="icons.heart" class="lucide club-card__icon" />
            </GridLayout>
            <Label :text="membership.name || 'Clubmitglied'" class="club-card__name mt-m" />
            <Label :text="`Mitglied seit ${memberSinceLabel}`" class="club-card__since" />
          </StackLayout>
          <StackLayout v-else class="card mx-sm mt-s">
            <Label text="Sie sind als Gast unterwegs" class="ty-headline-xs text-grey-700" />
            <Label
              text="Alles Wichtige bleibt frei zugänglich. Der Club bringt Sie näher ran: früher lesen, Backstage, Bonusfolgen."
              class="ty-text-s text-grey-600 mt-xs"
              textWrap="true"
            />
            <Button text="Unterstützer:in werden" class="btn-primary mt-s" @tap="openJoinFlow()" />
          </StackLayout>

          <!-- Membership management (simulated) -->
          <template v-if="membership.isMember">
            <SectionHeader title="Meine Mitgliedschaft" />
            <StackLayout class="card mx-sm">
              <GridLayout columns="*, auto">
                <Label col="0" text="Ihr Beitrag" class="ty-text-m text-grey-700" />
                <Label
                  col="1"
                  :text="`${membership.amountEur} € / ${membership.interval === 'monatlich' ? 'Monat' : 'Jahr'}`"
                  class="ty-headline-xs text-grey-700"
                />
              </GridLayout>
              <GridLayout columns="*, *" class="mt-s">
                <Button col="0" text="Beitrag ändern" class="btn-secondary mr-s" @tap="openJoinFlow()" />
                <Button
                  col="1"
                  :text="membership.paused ? 'Fortsetzen' : 'Pausieren'"
                  class="btn-secondary"
                  @tap="togglePause"
                />
              </GridLayout>
              <Label
                v-if="membership.paused"
                text="Ihre Mitgliedschaft ist pausiert (simuliert) — Backstage bleibt bis Monatsende offen."
                class="ty-text-s text-grey-600 mt-s"
                textWrap="true"
              />
            </StackLayout>

            <!-- Impact -->
            <SectionHeader title="Mein Impact" />
            <StackLayout class="impact-card mx-sm">
              <Label :text="impactLine" class="ty-text-m text-grey-700" textWrap="true" />
              <StackLayout
                v-for="article in impactArticles"
                :key="article.slug"
                class="impact-card__article mt-s"
                @tap="openArticle(article.url)"
              >
                <Label :text="article.title" class="ty-text-m font-sans-semibold text-grey-700" textWrap="true" :maxLines="2" />
              </StackLayout>
            </StackLayout>

            <!-- Quarterly report -->
            <SectionHeader title="Quartalsbericht" />
            <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openReport">
              <Label col="0" :text="icons.fileText" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label :text="quarterlyReport.quarter" class="hub-card__title" textWrap="true" />
                <Label text="Wohin Ihr Beitrag fließt — transparent aufgeschlüsselt." class="hub-card__teaser" textWrap="true" />
              </StackLayout>
              <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
            </GridLayout>

            <!-- Backstage entry (permanent, calm) -->
            <SectionHeader title="Backstage" />
            <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openBackstage">
              <Label col="0" :text="icons.sparkles" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label text="Ihr Backstage" class="hub-card__title" />
                <Label text="Tagebücher, Bonusfolgen, Events" class="hub-card__teaser" />
              </StackLayout>
              <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
            </GridLayout>
          </template>
          <template v-else>
            <SectionHeader title="Backstage" />
            <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openBackstage">
              <Label col="0" :text="icons.sparkles" class="lucide hub-card__icon" />
              <StackLayout col="1">
                <Label text="Backstage ansehen" class="hub-card__title" />
                <Label text="Was Clubmitglieder erwartet — offen angeteasert." class="hub-card__teaser" textWrap="true" />
              </StackLayout>
              <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
            </GridLayout>
          </template>

          <!-- Saved articles -->
          <SectionHeader title="Gespeichert" />
          <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openSaved">
            <Label col="0" :text="icons.bookmark" class="lucide hub-card__icon" />
            <StackLayout col="1">
              <Label text="Gespeicherte Artikel" class="hub-card__title" />
              <Label :text="savedCountLabel" class="hub-card__teaser" />
            </StackLayout>
            <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
          </GridLayout>

          <!-- Newsletter management -->
          <SectionHeader title="Newsletter" />
          <StackLayout class="card mx-sm">
            <GridLayout columns="*, auto" class="newsletter-row">
              <StackLayout col="0">
                <Label text="Spotlight" class="ty-text-m text-grey-700" />
                <Label text="Das Wichtigste, werktags am Morgen" class="ty-text-s text-grey-500" />
              </StackLayout>
              <Switch col="1" v-model="settings.newsletter.spotlight" class="onboarding__switch" />
            </GridLayout>
            <GridLayout columns="*, auto" class="newsletter-row hairline-top">
              <StackLayout col="0">
                <Label text="Spotlight Schweiz" class="ty-text-m text-grey-700" />
                <Label text="Recherchen aus der Schweiz" class="ty-text-s text-grey-500" />
              </StackLayout>
              <Switch col="1" v-model="settings.newsletter.spotlightCh" class="onboarding__switch" />
            </GridLayout>
            <GridLayout columns="*, auto" class="newsletter-row hairline-top">
              <StackLayout col="0">
                <Label text="Klima" class="ty-text-m text-grey-700" />
                <Label text="Die Klima-Recherchen der Woche" class="ty-text-s text-grey-500" />
              </StackLayout>
              <Switch col="1" v-model="settings.newsletter.klima" class="onboarding__switch" />
            </GridLayout>
          </StackLayout>

          <!-- Settings -->
          <SectionHeader title="Einstellungen" />
          <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openSettings">
            <Label col="0" :text="icons.settings" class="lucide hub-card__icon" />
            <StackLayout col="1">
              <Label text="App-Einstellungen" class="hub-card__title" />
              <Label text="Benachrichtigungen, Textgröße, Über CORRECTIV" class="hub-card__teaser" textWrap="true" />
            </StackLayout>
            <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
          </GridLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { knownFolders, path, File } from '@nativescript/core';
import { icons } from '../../ui/icons';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import BackstagePage from '../backstage/BackstagePage.vue';
import SavedArticlesPage from './SavedArticlesPage.vue';
import QuarterlyReportPage from './QuarterlyReportPage.vue';
import SettingsPage from './SettingsPage.vue';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { quarterlyReport } from '../../data/quartalsbericht';
import { useMembershipStore } from '../../stores/membership';
import { useSettingsStore } from '../../stores/settings';
import { useSavedArticlesStore } from '../../stores/savedArticles';
import { useNavigation } from '../../composables/useNavigation';
import { useJoinFlow } from '../../composables/useJoinFlow';
import { formatDateShortDe } from '../../lib/format';

const membership = useMembershipStore();
const settings = useSettingsStore();
const saved = useSavedArticlesStore();
const { navigate } = useNavigation();
const { openJoinFlow } = useJoinFlow();

const memberSinceLabel = computed(() =>
  membership.memberSince ? formatDateShortDe(membership.memberSince) : '',
);

const savedCountLabel = computed(() => {
  const n = saved.items.length;
  return n === 0 ? 'Noch nichts gespeichert' : n === 1 ? '1 Artikel' : `${n} Artikel`;
});

const impactLine = computed(() => {
  if (!membership.memberSince) return '';
  const months = Math.max(
    1,
    Math.round((Date.now() - new Date(membership.memberSince).getTime()) / (30 * 864e5)),
  );
  const time = months < 2 ? 'seit Kurzem' : `seit ${months} Monaten`;
  return `Sie unterstützen CORRECTIV ${time} — unter anderem diese Recherchen wurden mit ermöglicht:`;
});

interface ImpactArticle {
  slug: string;
  title: string;
  url: string;
}

/** Three real investigations from the bundled offline index */
const impactArticles = computed((): ImpactArticle[] => {
  try {
    const file = path.join(knownFolders.currentApp().path, 'assets', 'data', 'articles', 'index.json');
    const index = JSON.parse(File.fromPath(file).readTextSync()) as {
      articles: { slug: string; title: string; url: string; feed: string }[];
    };
    return index.articles.filter((a) => a.feed === 'recherchen').slice(0, 3);
  } catch {
    return [];
  }
});

function togglePause() {
  membership.paused = !membership.paused;
}

function openArticle(url: string) {
  navigate(ArticleReaderPage, { props: { url } });
}
function openBackstage() {
  navigate(BackstagePage);
}
function openSaved() {
  navigate(SavedArticlesPage);
}
function openReport() {
  navigate(QuarterlyReportPage);
}
function openSettings() {
  navigate(SettingsPage);
}
</script>
