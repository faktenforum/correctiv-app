<template>
  <Page actionBarHidden="true" @loaded="onPageLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <!-- Nativer Header: Back, Teilen, Speichern -->
      <GridLayout row="0" columns="auto, *, auto, auto" class="reader-header hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide reader-header__icon" @tap="goBack()" />
        <Label col="1" :text="badgeText" class="reader-header__badge" verticalAlignment="center" />
        <Label col="2" :text="icons.share" class="lucide reader-header__icon" @tap="share" />
        <Label
          col="3"
          :text="isSaved ? icons.bookmarkCheck : icons.bookmark"
          class="lucide reader-header__icon"
          :class="{ 'reader-header__icon--active': isSaved }"
          @tap="toggleSave"
        />
      </GridLayout>

      <!-- Inhalt -->
      <GridLayout row="1">
        <AWebView
          ref="webviewRef"
          :visibility="status === 'ready' ? 'visible' : 'collapsed'"
          class="reader-webview"
          displayZoomControls="false"
          @shouldOverrideUrlLoading="onShouldOverrideUrlLoading"
        />
        <StackLayout v-if="status === 'loading'" verticalAlignment="center" class="px-m">
          <ActivityIndicator busy="true" class="reader-spinner" />
          <Label text="Artikel wird geladen …" class="ty-text-m text-grey-600 mt-s" textWrap="true" horizontalAlignment="center" />
        </StackLayout>
        <StackLayout v-if="status === 'error'" verticalAlignment="center" class="px-m">
          <Label :text="icons.wifiOff" class="lucide reader-error-icon" horizontalAlignment="center" />
          <Label
            text="Der Artikel konnte nicht geladen werden. Prüfen Sie Ihre Internetverbindung."
            class="ty-text-m text-grey-600 mt-s"
            textWrap="true"
            horizontalAlignment="center"
          />
          <Button text="Erneut versuchen" class="btn-secondary mt-m" @tap="load" />
        </StackLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import * as SocialShare from '@nativescript/social-share';
import type { AWebView, ShouldOverrideUrlLoadEventData } from '@nativescript-community/ui-webview';
import { icons } from '../../ui/icons';
import type { ArticleDetail } from '../../types/models';
import { loadArticle, buildReaderHtml } from '../../services/article.service';
import { useNavigation } from '../../composables/useNavigation';
import { useSettingsStore } from '../../stores/settings';
import { useSavedArticlesStore } from '../../stores/savedArticles';
import { useMembershipStore } from '../../stores/membership';
import { useJoinFlow } from '../../composables/useJoinFlow';
import ArticleReaderPage from './ArticleReaderPage.vue';

const props = defineProps<{ url: string; title?: string }>();

const { navigate, goBack } = useNavigation();
const settings = useSettingsStore();
const saved = useSavedArticlesStore();
const membership = useMembershipStore();
const { openJoinFlow } = useJoinFlow();

const webviewRef = ref<{ nativeView?: AWebView }>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
const detail = ref<ArticleDetail | null>(null);

const badgeText = computed(() =>
  detail.value?.rating ? 'FAKTENCHECK' : (detail.value?.topline ?? '').toUpperCase(),
);
const isSaved = computed(() => saved.isSaved(props.url));

let pageLoaded = false;

function onPageLoaded() {
  if (pageLoaded) return;
  pageLoaded = true;
  load();
}

async function load() {
  status.value = 'loading';
  try {
    detail.value = await loadArticle(props.url);
    const html = buildReaderHtml(detail.value, {
      isMember: membership.isMember,
      textScale: settings.textScale,
    });
    const webview = webviewRef.value?.nativeView;
    if (webview) {
      webview.src = html; // HTML-String → loadDataWithBaseURL(file:///<app>/)
      status.value = 'ready';
    }
  } catch (err) {
    console.error('Artikel laden fehlgeschlagen:', err);
    status.value = 'error';
  }
}

function onShouldOverrideUrlLoading(args: ShouldOverrideUrlLoadEventData) {
  const url = args.url ?? '';
  if (url.startsWith('file://') || url.startsWith('data:')) return;
  args.cancel = true;
  if (url.startsWith('correctiv://join')) {
    openJoinFlow();
    return;
  }
  // correctiv.org-Artikel im eigenen Reader öffnen, alles andere im Browser
  if (/^https?:\/\/(www\.)?correctiv\.org\/.+\/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
    navigate(ArticleReaderPage, { props: { url } });
  } else if (url.startsWith('http')) {
    Utils.openUrl(url);
  }
}

function share() {
  if (!detail.value) return;
  SocialShare.shareText(`${detail.value.headline}\n${props.url}`, 'Artikel teilen');
}

function toggleSave() {
  if (!detail.value) return;
  saved.toggle({
    url: props.url,
    title: detail.value.headline,
    topline: detail.value.topline ?? null,
    rating: detail.value.rating ?? null,
    savedAt: new Date().toISOString(),
  });
}
</script>
