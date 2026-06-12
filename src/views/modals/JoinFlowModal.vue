<template>
  <!-- M7 baut den vollständigen 4-Schritte-Flow; das hier ist der verdrahtete Kern,
       damit Status-Flip und correctiv://join schon früh end-to-end funktionieren. -->
  <Page actionBarHidden="true">
    <GridLayout rows="auto, *" class="bg-grey-100">
      <GridLayout row="0" columns="*, auto" class="px-sm py-s">
        <Label col="1" :text="icons.x" class="lucide reader-header__icon" @tap="$closeModal()" />
      </GridLayout>
      <StackLayout row="1" verticalAlignment="center" class="px-m">
        <Label text="Unterstützer:in werden" class="ty-headline-xl text-grey-700" textWrap="true" />
        <Label
          text="CORRECTIV gehört niemandem. Außer allen. Der vollständige Beitritts-Flow folgt in M7."
          class="ty-text-m text-grey-600 mt-s"
          textWrap="true"
        />
        <Button text="Beitritt simulieren (10 €/Monat)" class="btn-primary mt-m" @tap="join" />
        <Button text="Erstmal umsehen" class="btn-secondary mt-s" @tap="$closeModal()" />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { $closeModal } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import { useMembershipStore } from '../../stores/membership';

const membership = useMembershipStore();

function join() {
  membership.join(10, 'monatlich');
  $closeModal();
}
</script>
