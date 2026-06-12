<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *, auto" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Mitmachen" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <Label text="CROWDNEWSROOM" class="callout-kicker" />
          <Label :text="callout.title" class="ty-headline-xl text-grey-700 font-serif-bold mt-xs" textWrap="true" />
          <GridLayout columns="auto, auto" class="mt-s">
            <Label col="0" :text="icons.users" class="lucide callout-count-icon" />
            <Label col="1" :text="`${formatNumberDe(totalCount)} Beiträge bisher`" class="callout-count" />
          </GridLayout>

          <Label
            v-for="(paragraph, i) in callout.intro"
            :key="i"
            :text="paragraph"
            class="ty-text-m text-grey-700 mt-s"
            textWrap="true"
          />

          <!-- Who asks + privacy in plain language (trust is part of the product) -->
          <StackLayout class="card mt-m">
            <Label text="Wer fragt?" class="ty-headline-xs text-grey-700" />
            <Label :text="callout.whoAsks" class="ty-text-s text-grey-600 mt-xs" textWrap="true" />
            <Label text="Was passiert mit Ihren Daten?" class="ty-headline-xs text-grey-700 mt-s" />
            <Label :text="callout.dataUse" class="ty-text-s text-grey-600 mt-xs" textWrap="true" />
          </StackLayout>

          <Label
            v-if="participation.hasSubmitted(callout.slug)"
            text="✓ Sie haben bereits beigetragen — danke! Sie können weitere Hinweise einreichen."
            class="ty-text-s callout-submitted mt-s"
            textWrap="true"
          />
        </StackLayout>
      </ScrollView>

      <StackLayout row="2" class="px-sm py-s hairline-top">
        <Button text="Mitmachen" class="btn-primary" @tap="startForm" />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import type { Callout } from '../../data/callouts';
import CalloutFormPage from './CalloutFormPage.vue';
import { useNavigation } from '../../composables/useNavigation';
import { useParticipationStore } from '../../stores/participation';
import { formatNumberDe } from '../../lib/format';

const props = defineProps<{ callout: Callout }>();
const { navigate, goBack } = useNavigation();
const participation = useParticipationStore();

const totalCount = computed(
  () => props.callout.responseCount + participation.extraCount(props.callout.slug),
);

function startForm() {
  navigate(CalloutFormPage, { props: { callout: props.callout } });
}
</script>
