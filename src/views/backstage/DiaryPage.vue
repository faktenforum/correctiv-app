<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Recherchetagebuch" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <ClubBadge text="BACKSTAGE" />
          <Label :text="entry.series" class="ty-text-s text-emphasis mt-s" />
          <Label :text="entry.title" class="ty-headline-xl text-grey-700 font-serif-bold mt-xs" textWrap="true" />
          <Label :text="formatDateDe(entry.date)" class="ty-text-s text-grey-500 mt-xs" />
          <Label
            v-for="(paragraph, i) in entry.body"
            :key="i"
            :text="paragraph"
            class="ty-text-article text-grey-700 mt-m"
            textWrap="true"
          />
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import type { DiaryEntry } from '../../data/backstage';
import ClubBadge from '../../components/ui/ClubBadge.vue';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateDe } from '../../lib/format';

defineProps<{ entry: DiaryEntry }>();
const { goBack } = useNavigation();
</script>
