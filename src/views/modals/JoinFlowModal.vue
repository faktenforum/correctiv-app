<template>
  <Page actionBarHidden="true" class="bg-grey-100">
    <GridLayout rows="auto, auto, *, auto" class="bg-grey-100">
      <GridLayout row="0" columns="*, auto" class="px-sm py-s">
        <Label col="1" :text="icons.x" class="lucide reader-header__icon" @tap="$closeModal()" />
      </GridLayout>

      <!-- Step indicator -->
      <GridLayout row="1" columns="*, *, *, *" class="step-indicator">
        <Label
          v-for="i in 4"
          :key="i"
          :col="i - 1"
          class="step-indicator__bar"
          :class="{ 'step-indicator__bar--active': i - 1 <= step }"
        />
      </GridLayout>

      <!-- Step 1: why — impact with real numbers -->
      <ScrollView v-if="step === 0" row="2">
        <StackLayout class="px-m py-m">
          <Label text="CORRECTIV gehört niemandem. Außer allen." class="ty-headline-xl text-grey-700 font-serif-bold" textWrap="true" />
          <Label
            text="Unser Journalismus bleibt frei. Für alle. Ihr Beitrag macht genau das möglich."
            class="ty-text-l text-grey-700 mt-s"
            textWrap="true"
          />
          <GridLayout columns="auto, *" class="mt-m">
            <Label col="0" text="247" class="join-stat__number" />
            <Label col="1" text="Recherchen im letzten Jahr — alle frei zugänglich" class="join-stat__label" textWrap="true" />
          </GridLayout>
          <GridLayout columns="auto, *" class="mt-s">
            <Label col="0" text="31.000+" class="join-stat__number" />
            <Label col="1" text="Menschen tragen CORRECTIV bereits" class="join-stat__label" textWrap="true" />
          </GridLayout>
          <GridLayout columns="auto, *" class="mt-s">
            <Label col="0" text="0" class="join-stat__number" />
            <Label col="1" text="Artikel hinter einer Paywall — heute und in Zukunft" class="join-stat__label" textWrap="true" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Step 2: amount -->
      <ScrollView v-if="step === 1" row="2">
        <StackLayout class="px-m py-m">
          <Label text="Ihr Beitrag" class="ty-headline-xl text-grey-700" textWrap="true" />
          <!-- Giant serif amount, centered (design draft) -->
          <GridLayout columns="auto, auto" horizontalAlignment="center" class="mt-s">
            <Label col="0" :text="`${displayAmount} €`" class="join-amount" />
            <Label
              col="1"
              :text="interval === 'monatlich' ? 'im Monat' : 'im Jahr'"
              class="join-amount__interval"
              verticalAlignment="bottom"
            />
          </GridLayout>
          <Slider v-model="amount" minValue="5" maxValue="50" class="join-slider" />
          <GridLayout columns="auto, *, auto" class="mt-xs">
            <Label col="0" text="5 €" class="ty-text-s text-grey-500" />
            <Label col="2" text="50 €" class="ty-text-s text-grey-500" />
          </GridLayout>

          <GridLayout columns="*, *" class="join-interval mt-m">
            <Label
              col="0"
              text="Monatlich"
              class="join-interval__option"
              :class="{ 'join-interval__option--active': interval === 'monatlich' }"
              @tap="interval = 'monatlich'"
            />
            <Label
              col="1"
              text="Jährlich"
              class="join-interval__option"
              :class="{ 'join-interval__option--active': interval === 'jährlich' }"
              @tap="interval = 'jährlich'"
            />
          </GridLayout>

          <!-- Perk thresholds — invitation framing, no tiers; lines light up when reached -->
          <StackLayout class="card mt-m">
            <Label
              :text="`${displayAmount >= 15 ? '✓ ' : ''}Ab 15 €: das CORRECTIV-Bookzine viermal im Jahr per Post`"
              class="perk-line"
              :class="{ 'perk-line--active': displayAmount >= 15 }"
              textWrap="true"
            />
            <Label
              :text="`${displayAmount >= 30 ? '✓ ' : ''}Ab 30 €: signierte Neuerscheinung des CORRECTIV Verlags`"
              class="perk-line mt-xs"
              :class="{ 'perk-line--active': displayAmount >= 30 }"
              textWrap="true"
            />
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Step 3: data (mock) -->
      <ScrollView v-if="step === 2" row="2">
        <StackLayout class="px-m py-m">
          <Label text="Ihre Daten" class="ty-headline-xl text-grey-700" textWrap="true" />
          <Label
            text="Für den Prototyp wird nichts übertragen — Zahlung und Konto sind simuliert."
            class="ty-text-s text-grey-500 mt-xs"
            textWrap="true"
          />
          <Label text="Name" class="ty-headline-xs text-grey-700 mt-m" />
          <TextField v-model="name" hint="Vor- und Nachname" class="form-textfield mt-xs" />
          <Label text="E-Mail" class="ty-headline-xs text-grey-700 mt-s" />
          <TextField v-model="email" hint="name@beispiel.de" keyboardType="email" class="form-textfield mt-xs" />
          <StackLayout class="card mt-m">
            <Label text="Zahlungsart: SEPA-Lastschrift (simuliert)" class="ty-text-s text-grey-600" textWrap="true" />
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Step 4: welcome — yellow check circle + serif headline (design draft) -->
      <StackLayout v-if="step === 3" row="2" verticalAlignment="center" class="px-m">
        <GridLayout class="join-success__circle" horizontalAlignment="center">
          <Label text="✓" class="join-success__check" />
        </GridLayout>
        <Label
          text="Willkommen im Club."
          class="ty-headline-xl text-grey-700 font-serif-bold mt-m"
          textAlignment="center"
          textWrap="true"
        />
        <Label
          :text="`Sie unterstützen CORRECTIV ab jetzt mit ${displayAmount} € ${interval === 'monatlich' ? 'im Monat' : 'im Jahr'}. Ab sofort lesen Sie Recherchen früher, hören Bonusfolgen und sehen hinter die Kulissen.`"
          class="ty-text-m text-grey-600 mt-s"
          textAlignment="center"
          textWrap="true"
        />
      </StackLayout>

      <!-- Footer actions -->
      <StackLayout row="3" class="px-sm py-s hairline-top">
        <Button v-if="step === 0" text="Weiter" class="btn-primary" @tap="step = 1" />
        <Button v-else-if="step === 1" :text="`Mit ${displayAmount} € unterstützen`" class="btn-primary" @tap="step = 2" />
        <Button v-else-if="step === 2" text="Jetzt Mitglied werden" class="btn-primary" :isEnabled="dataValid" @tap="join" />
        <Button v-else text="Ins Backstage" class="btn-dark" @tap="finishToBackstage" />
        <Button v-if="step < 3" text="Erstmal umsehen" class="btn-quiet mt-xs" @tap="$closeModal()" />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed } from 'nativescript-vue';
import { $closeModal } from 'nativescript-vue';
import { icons } from '../../ui/icons';
import BackstagePage from '../backstage/BackstagePage.vue';
import { useMembershipStore } from '../../stores/membership';
import { useNavigation } from '../../composables/useNavigation';
import { useThemeForModal } from '../../composables/useTheme';

const membership = useMembershipStore();
const { navigate } = useNavigation();
useThemeForModal();

const step = ref(0);
const amount = ref(10);
const interval = ref<'monatlich' | 'jährlich'>('monatlich');
const name = ref('');
const email = ref('');

// Slider values are floats while dragging — display and book whole euros
const displayAmount = computed(() => Math.round(amount.value));

// Mock data step: any non-empty values suffice in the prototype
const dataValid = computed(() => name.value.trim().length > 1 && email.value.includes('@'));

function join() {
  // THE status flip: every club touchpoint in the app reacts in the same tick
  membership.join(Math.round(amount.value), interval.value, name.value.trim());
  step.value = 3;
}

function finishToBackstage() {
  $closeModal();
  setTimeout(() => navigate(BackstagePage), 300);
}
</script>
