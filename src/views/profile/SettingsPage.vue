<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Einstellungen" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="pb-l">
          <SectionHeader title="Benachrichtigungen" />
          <StackLayout class="card mx-sm">
            <GridLayout columns="*, auto">
              <StackLayout col="0">
                <Label text="Push-Mitteilungen" class="ty-text-m text-grey-700" />
                <Label text="Neue Recherchen und Mitmach-Aufrufe (simuliert)" class="ty-text-s text-grey-500" textWrap="true" />
              </StackLayout>
              <Switch col="1" v-model="settings.pushOptIn" class="onboarding__switch" />
            </GridLayout>
          </StackLayout>

          <SectionHeader title="Darstellung" />
          <StackLayout class="card mx-sm">
            <GridLayout columns="*, auto">
              <Label col="0" text="An Systemeinstellung orientieren" class="ty-text-m text-grey-700" textWrap="true" />
              <Switch col="1" v-model="followSystem" class="onboarding__switch" />
            </GridLayout>
            <GridLayout v-if="!followSystem" columns="*, auto" class="mt-s">
              <Label col="0" text="Dunkelmodus" class="ty-text-m text-grey-700" />
              <Switch col="1" v-model="darkOn" class="onboarding__switch" />
            </GridLayout>
          </StackLayout>

          <SectionHeader title="Textgröße im Artikel" />
          <StackLayout class="card mx-sm">
            <GridLayout columns="*, *, *">
              <Label
                v-for="(option, i) in textScaleOptions"
                :key="option.value"
                :col="i"
                :text="option.label"
                class="text-scale-option"
                :class="{ 'text-scale-option--active': settings.textScale === option.value }"
                @tap="settings.textScale = option.value"
              />
            </GridLayout>
            <Label
              text="Wirkt sich auf die Artikel-Ansicht aus."
              class="ty-text-s text-grey-500 mt-s"
              textWrap="true"
            />
          </StackLayout>

          <SectionHeader title="Über CORRECTIV" />
          <StackLayout class="card mx-sm">
            <Label
              text="CORRECTIV ist ein gemeinnütziges, unabhängiges Recherchezentrum. Recherchen für die Gesellschaft — finanziert von Menschen wie Ihnen."
              class="ty-text-m text-grey-700"
              textWrap="true"
            />
            <Button text="correctiv.org öffnen" class="btn-secondary mt-s" @tap="open('https://correctiv.org/ueber-uns/')" />
            <Button text="Impressum" class="btn-quiet mt-xs" @tap="open('https://correctiv.org/impressum/')" />
            <Button text="Datenschutz" class="btn-quiet" @tap="open('https://correctiv.org/datenschutz/')" />
          </StackLayout>

          <SectionHeader title="Demo" />
          <StackLayout class="card mx-sm">
            <Label
              text="Für Vorführungen: setzt Mitgliedschaft und Onboarding zurück."
              class="ty-text-s text-grey-600"
              textWrap="true"
            />
            <Button text="Demo-Zustand zurücksetzen" class="btn-secondary mt-s" @tap="resetDemo" />
            <Label v-if="resetDone" text="✓ Zurückgesetzt — App neu starten für das Onboarding." class="ty-text-s callout-submitted mt-s" textWrap="true" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import { useSettingsStore } from '../../stores/settings';
import { useMembershipStore } from '../../stores/membership';
import { useInterestsStore } from '../../stores/interests';
import { useNavigation } from '../../composables/useNavigation';

const settings = useSettingsStore();
const membership = useMembershipStore();
const interests = useInterestsStore();
const { goBack } = useNavigation();

const resetDone = ref(false);

const followSystem = computed({
  get: () => settings.theme === 'system',
  set: (v: boolean) => settings.setTheme(v ? 'system' : 'light'),
});
const darkOn = computed({
  get: () => settings.theme === 'dark',
  set: (v: boolean) => settings.setTheme(v ? 'dark' : 'light'),
});

const textScaleOptions = [
  { label: 'A', value: 0.9 },
  { label: 'A+', value: 1 },
  { label: 'A++', value: 1.15 },
];

function open(url: string) {
  Utils.openUrl(url);
}

function resetDemo() {
  membership.reset();
  interests.selected = [];
  settings.onboardingDone = false;
  settings.pushOptIn = false;
  resetDone.value = true;
}
</script>
