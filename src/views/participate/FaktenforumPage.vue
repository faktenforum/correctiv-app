<template>
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="auto, *" class="px-sm py-s hairline-bottom">
        <Label col="0" :text="icons.arrowLeft" class="lucide back-icon" @tap="goBack()" />
        <Label col="1" text="Faktenforum" class="ty-headline-xs text-grey-700 ml-s" verticalAlignment="center" />
      </GridLayout>
      <ScrollView row="1">
        <StackLayout class="py-s">
          <StackLayout class="px-sm pb-s">
            <Label
              text="Die Community prüft Behauptungen — gemeinsam mit der CORRECTIV-Redaktion. Schauen Sie, was gerade in Arbeit ist."
              class="ty-text-m text-grey-600"
              textWrap="true"
            />
          </StackLayout>
          <StackLayout
            v-for="claim in claims"
            :key="claim.id"
            class="claim-card mx-sm mb-s"
            @tap="openClaim(claim)"
          >
            <GridLayout columns="auto, *">
              <Label col="0" :text="claimStatusTag(claim).text" class="status-tag" :class="claimStatusTag(claim).cls" />
            </GridLayout>
            <Label :text="`„${claim.quote}“`" class="claim-card__quote" textWrap="true" />
            <Label :text="claim.shortId + ' · eingereicht ' + formatDateShortDe(claim.submittedAt)" class="claim-card__meta" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import { claims, claimStatusTag, type Claim } from '../../data/claims';
import ClaimDetailPage from './ClaimDetailPage.vue';
import { useNavigation } from '../../composables/useNavigation';
import { formatDateShortDe } from '../../lib/format';

const { navigate, goBack } = useNavigation();

function openClaim(claim: Claim) {
  navigate(ClaimDetailPage, { props: { claim } });
}
</script>
