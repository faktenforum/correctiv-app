<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <StackLayout row="0" class="px-sm py-s hairline-bottom">
        <Label text="CORRECTIV" class="brand" />
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="pb-l">
          <Label text="Mitmachen" class="ty-headline-xl text-grey-700 px-sm pt-m" textWrap="true" />
          <Label
            text="Journalismus zum Mitmachen: Ihre Hinweise, Beobachtungen und Prüfungen machen Recherchen erst möglich."
            class="ty-text-m text-grey-600 px-sm mt-xs"
            textWrap="true"
          />

          <!-- Active callouts (CrowdNewsroom) -->
          <SectionHeader title="Aktive Aufrufe" />
          <StackLayout
            v-for="callout in callouts"
            :key="callout.slug"
            class="callout-list-card mx-sm mb-s"
            @tap="openCallout(callout)"
          >
            <Label text="CROWDNEWSROOM" class="callout-kicker" />
            <Label :text="callout.title" class="callout-list-card__title" textWrap="true" />
            <Label :text="callout.excerpt" class="callout-list-card__teaser" textWrap="true" :maxLines="2" />
            <GridLayout columns="*, auto" class="mt-s">
              <StackLayout col="0" class="callout-progress" verticalAlignment="center">
                <StackLayout class="callout-progress__fill" :width="progressWidth(callout)" />
              </StackLayout>
              <Label col="1" :text="`${formatNumberDe(totalCount(callout))} Beiträge`" class="callout-list-card__count ml-s" />
            </GridLayout>
            <Label
              v-if="participation.hasSubmitted(callout.slug)"
              text="✓ Sie haben beigetragen"
              class="ty-text-s callout-submitted mt-xs"
            />
          </StackLayout>

          <!-- Faktenforum -->
          <SectionHeader title="Faktenforum" />
          <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openFaktenforum">
            <Label col="0" :text="icons.search" class="lucide hub-card__icon" />
            <StackLayout col="1">
              <Label text="Behauptungen prüfen" class="hub-card__title" textWrap="true" />
              <Label
                :text="`${claims.length} Behauptungen in Arbeit — prüfen Sie mit`"
                class="hub-card__teaser"
                textWrap="true"
              />
            </StackLayout>
            <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
          </GridLayout>

          <!-- Abriss-Atlas -->
          <SectionHeader title="Abriss-Atlas" />
          <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openAtlas">
            <Label col="0" :text="icons.mapPin" class="lucide hub-card__icon" />
            <StackLayout col="1">
              <Label text="Abrisse melden" class="hub-card__title" textWrap="true" />
              <Label
                text="Welche Gebäude verschwinden? Dokumentieren Sie Abrisse in DE und CH."
                class="hub-card__teaser"
                textWrap="true"
              />
            </StackLayout>
            <Label col="2" :text="icons.chevronRight" class="lucide hub-card__chevron" />
          </GridLayout>

          <!-- Tip line -->
          <SectionHeader title="Tipp geben" />
          <GridLayout columns="auto, *, auto" class="hub-card mx-sm" @tap="openWhatsApp">
            <Label col="0" :text="icons.messageCircle" class="lucide hub-card__icon" />
            <StackLayout col="1">
              <Label text="Faktencheck-Tipp per WhatsApp" class="hub-card__title" textWrap="true" />
              <Label
                text="Verdächtige Behauptung gesehen? Schicken Sie sie der Faktencheck-Redaktion."
                class="hub-card__teaser"
                textWrap="true"
              />
            </StackLayout>
            <Label col="2" :text="icons.externalLink" class="lucide hub-card__chevron" />
          </GridLayout>

          <!-- Club community teaser — deliberately minimal here (concept) -->
          <StackLayout class="mx-sm mt-m community-teaser">
            <Label
              text="Clubmitglieder diskutieren Recherchen im Community-Bereich — bald auch in der App."
              class="ty-text-s text-grey-600"
              textWrap="true"
            />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { Utils } from '@nativescript/core';
import { icons } from '../../ui/icons';
import SectionHeader from '../../components/ui/SectionHeader.vue';
import { callouts, type Callout } from '../../data/callouts';
import { claims } from '../../data/claims';
import CalloutDetailPage from './CalloutDetailPage.vue';
import FaktenforumPage from './FaktenforumPage.vue';
import AbrissAtlasPage from './AbrissAtlasPage.vue';
import { useNavigation } from '../../composables/useNavigation';
import { useParticipationStore } from '../../stores/participation';
import { formatNumberDe } from '../../lib/format';

const { navigate } = useNavigation();
const participation = useParticipationStore();

function totalCount(callout: Callout): number {
  return callout.responseCount + participation.extraCount(callout.slug);
}

/** Progress bar width as a share of an (arbitrary) 3000-contribution goal */
function progressWidth(callout: Callout): string {
  const pct = Math.min(95, Math.round((totalCount(callout) / 3000) * 100));
  return `${Math.max(8, pct)}%`;
}

function openCallout(callout: Callout) {
  navigate(CalloutDetailPage, { props: { callout } });
}

function openFaktenforum() {
  navigate(FaktenforumPage);
}

function openAtlas() {
  navigate(AbrissAtlasPage);
}

function openWhatsApp() {
  // Real fact-check tip line number is public on correctiv.org
  Utils.openUrl('https://wa.me/4915142647500');
}
</script>
