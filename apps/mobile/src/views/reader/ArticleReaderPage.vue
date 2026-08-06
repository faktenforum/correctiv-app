<template>
  <Page actionBarHidden="true" @loaded="onPageLoaded">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <!-- Native header: back, share, save -->
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

      <!-- Content -->
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
          <Label
            text="Artikel wird geladen …"
            class="ty-text-m text-grey-600 mt-s"
            textWrap="true"
            horizontalAlignment="center"
          />
        </StackLayout>
        <StackLayout v-if="status === 'error'" verticalAlignment="center" class="px-m">
          <Label
            :text="icons.wifiOff"
            class="lucide reader-error-icon"
            horizontalAlignment="center"
          />
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
import { icons } from '@correctiv/app-core/ui/icons';
import type { Article } from '@correctiv/app-core/articles/types';
import { loadArticle } from '@correctiv/app-core/articles/load';
import { readerHtml } from '../../services/reader';
import { useNavigation } from '../../composables/useNavigation';
import { useSettingsStore } from '../../stores/core-bindings';
import { useSavedArticlesStore } from '../../stores/core-bindings';
import { useMembershipStore } from '../../stores/core-bindings';
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
const article = ref<Article | null>(null);

const badgeText = computed(() =>
  article.value?.rating ? 'FAKTENCHECK' : (article.value?.kicker ?? '').toUpperCase(),
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
    article.value = await loadArticle(props.url);
    const html = readerHtml(article.value, {
      isMember: membership.isMember,
      textScale: settings.textScale,
    });
    const webview = webviewRef.value?.nativeView;
    if (webview) {
      webview.src = html; // HTML string → loadDataWithBaseURL(file:///<app>/)
      status.value = 'ready';
    }
  } catch (err) {
    console.error('Article load failed:', err);
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
  // Open correctiv.org articles in our own reader, everything else in the browser
  if (/^https?:\/\/(www\.)?correctiv\.org\/.+\/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
    navigate(ArticleReaderPage, { props: { url } });
  } else if (url.startsWith('http')) {
    Utils.openUrl(url);
  }
}

function share() {
  if (!article.value) return;
  SocialShare.shareText(`${article.value.title}\n${props.url}`, 'Artikel teilen');
}

function toggleSave() {
  if (!article.value) return;
  saved.toggle({
    url: props.url,
    title: article.value.title,
    kicker: article.value.kicker ?? null,
    rating: article.value.rating ?? null,
    savedAt: new Date().toISOString(),
  });
}
</script>
