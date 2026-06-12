<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Gespeicherte Artikel" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="py-s">
          <Label
            v-if="saved.items.length === 0"
            text="Noch nichts gespeichert. Tippen Sie im Artikel auf das Lesezeichen, um ihn hier abzulegen."
            class="ty-text-m text-grey-600 px-sm py-m"
            textWrap="true"
          />
          <GridLayout
            v-for="article in saved.items"
            :key="article.url"
            columns="*, auto"
            class="px-sm py-s hairline-bottom"
            @tap="open(article.url)"
          >
            <StackLayout col="0">
              <Label v-if="article.topline" :text="article.topline.toUpperCase()" class="ty-text-s text-emphasis" />
              <Label :text="article.title" class="ty-text-m font-sans-semibold text-grey-700" textWrap="true" :maxLines="2" />
              <Label :text="`gespeichert ${formatDateShortDe(article.savedAt)}`" class="ty-text-s text-grey-500 mt-xs" />
            </StackLayout>
            <Label col="1" :text="icons.x" class="lucide saved-remove" @tap="saved.remove(article.url)" />
          </GridLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import ArticleReaderPage from '../reader/ArticleReaderPage.vue';
import { useSavedArticlesStore } from '../../stores/savedArticles';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateShortDe } from '../../lib/format';

const saved = useSavedArticlesStore();
const { navigate, goBack } = useNavigation();

function open(url: string) {
  navigate(ArticleReaderPage, { props: { url } });
}
</script>
