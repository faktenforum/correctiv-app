<template>
  <Page actionBarHidden="true">
    <GridLayout rows="*, auto" class="bg-grey-100">
      <StackLayout row="0" verticalAlignment="center" class="px-m">
        <Label :text="icons.check" class="lucide success-icon" horizontalAlignment="center" />
        <Label text="Danke für Ihren Beitrag!" class="ty-headline-xl text-grey-700 mt-m" textWrap="true" horizontalAlignment="center" />
        <Label
          text="Ihr Beitrag fließt in die Recherche ein. Die Redaktion prüft alle Hinweise — bei Rückfragen melden wir uns."
          class="ty-text-m text-grey-600 mt-s"
          textWrap="true"
          horizontalAlignment="center"
        />
        <Label
          :text="`${formatNumberDe(totalCount)} Menschen haben bereits beigetragen.`"
          class="ty-headline-xs text-grey-700 mt-m"
          horizontalAlignment="center"
        />
      </StackLayout>
      <StackLayout row="1" class="px-sm py-m">
        <Button text="Weitere Mitmach-Aktionen ansehen" class="btn-primary" @tap="backToOverview" />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { computed } from 'nativescript-vue';
import { Frame } from '@nativescript/core';
import { icons } from '../../ui/icons';
import type { Callout } from '../../data/callouts';
import { useParticipationStore } from '../../stores/participation';
import { useSettingsStore } from '../../stores/settings';
import { formatNumberDe } from '../../lib/format';

const props = defineProps<{ callout: Callout }>();
const participation = useParticipationStore();
const settings = useSettingsStore();

const totalCount = computed(
  () => props.callout.responseCount + participation.extraCount(props.callout.slug),
);

function backToOverview() {
  // Pop detail + form + success in one go: back to the tab root
  const frame = Frame.getFrameById(`tab-${settings.activeTab}`);
  while (frame?.canGoBack()) frame.goBack();
}
</script>
