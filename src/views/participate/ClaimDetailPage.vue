<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" :text="claim.shortId" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <GridLayout columns="auto, *">
            <Label col="0" :text="claimStatusTag(claim).text" class="status-tag" :class="claimStatusTag(claim).cls" />
          </GridLayout>
          <Label :text="`„${claim.quote}“`" class="ty-headline-m text-grey-700 font-serif-bold mt-s" textWrap="true" />
          <Label :text="claim.synopsis" class="ty-text-m text-grey-600 mt-s" textWrap="true" />

          <!-- Review progress: Eingereicht → In Prüfung → Geprüft (design draft) -->
          <GridLayout columns="*, *, *, *, *" class="claim-progress">
            <StackLayout col="0">
              <Label class="claim-progress__dot claim-progress__dot--done" />
              <Label text="Eingereicht" class="claim-progress__label" />
            </StackLayout>
            <Label col="1" class="claim-progress__line" />
            <StackLayout col="2">
              <Label class="claim-progress__dot" :class="{ 'claim-progress__dot--done': stage >= 1 }" />
              <Label text="In Prüfung" class="claim-progress__label" />
            </StackLayout>
            <Label col="3" class="claim-progress__line" />
            <StackLayout col="4">
              <Label class="claim-progress__dot" :class="{ 'claim-progress__dot--final': stage >= 2 }" />
              <Label text="Geprüft" class="claim-progress__label" />
            </StackLayout>
          </GridLayout>

          <Label text="Quellenbewertung" class="ty-headline-xs text-grey-700 mt-m" />
          <StackLayout v-if="claim.sources.length === 0" class="card mt-s">
            <Label text="Noch keine Quellen — die Community sammelt." class="ty-text-s text-grey-600" textWrap="true" />
          </StackLayout>
          <GridLayout
            v-for="(source, i) in claim.sources"
            :key="i"
            columns="auto, *"
            class="card mt-s"
            @tap="open(source.url)"
          >
            <Label col="0" :text="credibilityDot(source.credibility)" class="claim-source__dot" />
            <StackLayout col="1">
              <Label :text="source.note ?? source.url" class="ty-text-m text-grey-700" textWrap="true" />
              <Label :text="`Verlässlichkeit: ${source.credibility}`" class="ty-text-s text-grey-500" />
            </StackLayout>
          </GridLayout>

          <Button text="Eigenen Hinweis einreichen (im Faktenforum)" class="btn-secondary mt-m" @tap="openForum" />
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import { claimStatusTag, type Claim, type ClaimSource } from '../../data/claims';
import { useNavigation } from '../../composables/useNavigation';

const props = defineProps<{ claim: Claim }>();
const { goBack } = useNavigation();

const stage = computed(() => (props.claim.status === 'checked' ? 2 : props.claim.status === 'checking' ? 1 : 0));

function credibilityDot(level: ClaimSource['credibility']): string {
  return level === 'hoch' ? '●' : level === 'mittel' ? '◐' : '○';
}

function open(url: string) {
  if (url.startsWith('http')) Utils.openUrl(url);
}

function openForum() {
  Utils.openUrl('https://faktenforum.org');
}
</script>
