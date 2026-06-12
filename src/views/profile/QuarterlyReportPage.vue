<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" :text="quarterlyReport.quarter" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="px-sm py-m">
          <ClubBadge />
          <Label :text="quarterlyReport.quarter" class="ty-headline-xl text-grey-700 font-serif-bold mt-s" textWrap="true" />
          <Label :text="quarterlyReport.intro" class="ty-text-m text-grey-600 mt-s" textWrap="true" />

          <StackLayout v-for="section in quarterlyReport.sections" :key="section.heading" class="mt-m">
            <Label :text="section.heading" class="ty-headline-m text-grey-700" textWrap="true" />
            <Label :text="section.text" class="ty-text-m text-grey-700 mt-xs" textWrap="true" />
            <GridLayout
              v-for="figure in section.figures ?? []"
              :key="figure.label"
              columns="auto, *"
              class="report-figure mt-s"
            >
              <Label col="0" :text="figure.value" class="report-figure__value" />
              <Label col="1" :text="figure.label" class="report-figure__label" textWrap="true" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import ClubBadge from '../../components/ui/ClubBadge.vue';
import { quarterlyReport } from '../../data/quartalsbericht';
import { useNavigation } from '../../composables/useNavigation';

const { goBack } = useNavigation();
</script>
