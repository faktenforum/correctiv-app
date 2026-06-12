<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Smoke-Test" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <StackLayout row="1" verticalAlignment="center" class="px-m">
        <Label :text="`Detailseite im Frame „${source}“`" class="ty-headline-l text-grey-700" textWrap="true" />
        <Label
          text="Diese Seite prüft den Navigation-Stack pro Tab: Tab wechseln und zurückkommen — diese Seite muss noch offen sein."
          class="ty-text-m text-grey-600 mt-s"
          textWrap="true"
        />
        <Label
          text="Merriweather-Probe: Die Perfekte Frau — wie Autokraten ein Ideal erschaffen."
          class="ty-text-article text-grey-700 mt-m"
          textWrap="true"
        />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import { useNavigation } from '../../composables/useNavigation';

withDefaults(defineProps<{ source?: string }>(), { source: '?' });
const { goBack } = useNavigation();
</script>
