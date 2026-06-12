<template>
  <!-- Spotlight newsletter reader: same chrome as the article reader,
       newsletter layout, day back/forward navigation -->
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *, auto" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="SPOTLIGHT" class="reader-header__badge" verticalAlignment="center" />
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <Label :text="issue.subject" class="ty-headline-xl text-grey-700 font-serif-bold" textWrap="true" />
          <Label :text="formatDateDe(issue.date)" class="ty-text-s text-grey-500 mt-xs" />

          <StackLayout v-for="item in issue.items" :key="item.title" class="spotlight-reader-item mt-m">
            <GridLayout columns="auto, *">
              <Label col="0" :text="item.time" class="spotlight-card__time" />
              <Label col="1" :text="item.title" class="ty-headline-m text-grey-700" textWrap="true" />
            </GridLayout>
            <Label :text="item.text" class="ty-text-article text-grey-700 mt-xs" textWrap="true" />
            <Label
              v-if="item.articleUrl"
              text="Zur Recherche →"
              class="spotlight-reader-item__link mt-xs"
              @tap="openArticle(item.articleUrl)"
            />
          </StackLayout>

          <StackLayout class="card mt-l">
            <Label
              text="Spotlight erscheint werktags am Morgen — kostenlos per Mail."
              class="ty-text-s text-grey-600"
              textWrap="true"
            />
            <Button text="Newsletter verwalten" class="btn-quiet mt-xs" @tap="goToProfile" />
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Day navigation -->
      <GridLayout row="2" columns="*, *" class="px-sm py-s hairline-top">
        <Button
          col="0"
          text="← Ältere Ausgabe"
          class="btn-secondary mr-s"
          :isEnabled="index < spotlightIssues.length - 1"
          @tap="index += 1"
        />
        <Button col="1" text="Neuere Ausgabe →" class="btn-secondary" :isEnabled="index > 0" @tap="index -= 1" />
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { spotlightIssues } from '../../data/spotlight';
import ArticleReaderPage from './ArticleReaderPage.vue';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateDe } from '../../lib/format';

const props = withDefaults(defineProps<{ startIndex?: number }>(), { startIndex: 0 });
const { navigate, navigateInTab, goBack } = useNavigation();

const index = ref(props.startIndex);
const issue = computed(() => spotlightIssues[index.value]);

function openArticle(url: string) {
  navigate(ArticleReaderPage, { props: { url } });
}

function goToProfile() {
  navigateInTab('profile');
}
</script>
