<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Abriss-Atlas" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <!-- Static map snapshot (per concept: only hinted at in the prototype) -->
          <GridLayout class="atlas-map">
            <Label :text="icons.mapPin" class="lucide atlas-map__pin" />
            <Label text="Kartenausschnitt (statisch)" class="atlas-map__caption" />
          </GridLayout>
          <Label
            :text="`${formatNumberDe(atlasStats.totalReports)} gemeldete Abrisse in ${atlasStats.citiesCovered} Städten (DE/CH)`"
            class="ty-text-m text-grey-700 mt-s"
            textWrap="true"
          />

          <Label text="Zuletzt gemeldet" class="ty-headline-xs text-grey-700 mt-m" />
          <GridLayout
            v-for="entry in demolitionEntries"
            :key="entry.id"
            columns="auto, *, auto"
            class="py-s hairline-bottom"
          >
            <Label col="0" :text="icons.mapPin" class="lucide atlas-entry__icon" />
            <StackLayout col="1">
              <Label :text="entry.building" class="ty-text-m text-grey-700" textWrap="true" />
              <Label :text="`${entry.place} · ${entry.year}`" class="ty-text-s text-grey-500" />
            </StackLayout>
            <Label col="2" :text="entry.status" class="ty-text-s text-grey-500" verticalAlignment="center" />
          </GridLayout>

          <Button text="Abriss melden auf abriss-atlas.de" class="btn-primary mt-m" @tap="openAtlas" />
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import { demolitionEntries, atlasStats } from '../../data/abriss-atlas';
import { useNavigation } from '../../composables/useNavigation';
import { formatNumberDe } from '../../lib/format';

const { goBack } = useNavigation();

function openAtlas() {
  Utils.openUrl(atlasStats.url);
}
</script>
