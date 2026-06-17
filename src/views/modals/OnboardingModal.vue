<template>
  <!-- A modal <Page>'s own background-color doesn't paint reliably, so the
       FILLING inner layout carries the bg (like Player/JoinFlow). Mission
       (step 0) is the coral brand screen (design: bg-accent), theme-independent;
       later steps use bg-grey-100, which the .ns-dark class — applied to this
       modal root by useThemeForModal() — turns dark. -->
  <Page
    actionBarHidden="true"
    @loaded="onPageLoaded"
    :androidStatusBarBackground="step === 0 ? '#ff5064' : isDarkAppearance ? '#1a1a1a' : '#ffffff'"
    :statusBarStyle="step === 0 || isDarkAppearance ? 'light' : 'dark'"
  >
    <GridLayout rows="auto, *, auto" :class="step === 0 ? 'onboarding--mission' : 'bg-grey-100'">
      <!-- Header: step dots + skip (from step 2 onwards) -->
      <GridLayout row="0" columns="*, auto" class="px-sm py-s">
        <StackLayout col="0" orientation="horizontal" verticalAlignment="center">
          <Label
            v-for="i in 4"
            :key="i"
            text="●"
            class="onboarding__dot"
            :class="{ 'onboarding__dot--active': step === i - 1, 'onboarding__dot--light': step === 0 }"
          />
        </StackLayout>
        <Label
          v-if="step > 0"
          col="1"
          text="Überspringen"
          class="onboarding__skip"
          @tap="finish(false)"
        />
      </GridLayout>

      <!-- Step 1: mission (red, not skippable) -->
      <StackLayout v-if="step === 0" row="1" verticalAlignment="center" class="px-m">
        <Label text="CORRECTIV" class="onboarding__brand" />
        <Label
          text="Recherchen für die Gesellschaft"
          class="onboarding__mission-title"
          textWrap="true"
        />
        <StackLayout class="mt-l">
          <!-- Yellow bullet dots on red (design draft). Static rows —
               v-for over layout containers renders unreliably in nativescript-vue 3. -->
          <GridLayout rows="auto" columns="auto, *" class="mt-s">
            <Label col="0" text="●" class="onboarding__bullet" />
            <Label col="1" text="Gemeinnützig — uns gehört niemand" class="onboarding__fact" textWrap="true" />
          </GridLayout>
          <GridLayout rows="auto" columns="auto, *" class="mt-s">
            <Label col="0" text="●" class="onboarding__bullet" />
            <Label col="1" text="Spendenfinanziert — von Tausenden getragen" class="onboarding__fact" textWrap="true" />
          </GridLayout>
          <GridLayout rows="auto" columns="auto, *" class="mt-s">
            <Label col="0" text="●" class="onboarding__bullet" />
            <Label col="1" text="Ohne Paywall — Journalismus für alle" class="onboarding__fact" textWrap="true" />
          </GridLayout>
        </StackLayout>
      </StackLayout>

      <!-- Step 2: interests -->
      <ScrollView v-if="step === 1" row="1">
        <StackLayout class="px-sm py-m">
          <Label text="Was interessiert Sie?" class="ty-headline-xl text-grey-700" textWrap="true" />
          <Label
            text="Ihre Auswahl ordnet die Startseite — alles bleibt trotzdem zugänglich."
            class="ty-text-m text-grey-600 mt-xs"
            textWrap="true"
          />
          <WrapLayout class="mt-m">
            <Label
              v-for="interest in allInterests"
              :key="interest.id"
              :text="interest.label"
              class="chip onboarding__chip"
              :class="{ 'chip-active': interestsStore.selected.includes(interest.id) }"
              @tap="interestsStore.toggle(interest.id)"
            />
          </WrapLayout>
        </StackLayout>
      </ScrollView>

      <!-- Step 3: participate + push -->
      <ScrollView v-if="step === 2" row="1">
        <StackLayout class="px-sm py-m">
          <Label text="Recherchen, bei denen Sie mitmachen" class="ty-headline-xl text-grey-700" textWrap="true" />
          <Label
            text="Im CrowdNewsroom tragen tausende Menschen zu Recherchen bei. Im Faktenforum prüft die Community Behauptungen. Beides finden Sie im Tab „Mitmachen“."
            class="ty-text-m text-grey-600 mt-s"
            textWrap="true"
          />
          <GridLayout columns="*, auto" class="card mt-m">
            <StackLayout col="0">
              <Label text="Benachrichtigungen" class="ty-headline-xs text-grey-700" />
              <Label
                text="Bei neuen Recherchen und Mitmach-Aufrufen (simuliert)"
                class="ty-text-s text-grey-600"
                textWrap="true"
              />
            </StackLayout>
            <Switch col="1" v-model="settings.pushOptIn" class="onboarding__switch" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Step 4: club soft pitch (no dark pattern: two equal paths) -->
      <StackLayout v-if="step === 3" row="1" verticalAlignment="center" class="px-m">
        <Label text="CORRECTIV gehört niemandem. Außer allen." class="ty-headline-xl text-grey-700 font-serif-bold" textWrap="true" />
        <Label
          text="Unser Journalismus bleibt frei — ermöglicht von Menschen, die ihn unterstützen. Der Club ist Nähe, keine Paywall: Recherchen früher lesen, Backstage-Einblicke, Bonusfolgen."
          class="ty-text-m text-grey-600 mt-s"
          textWrap="true"
        />
      </StackLayout>

      <!-- Footer: actions -->
      <StackLayout row="2" class="px-sm py-m">
        <Button
          v-if="step < 3"
          :text="step === 0 ? 'Los geht’s' : 'Weiter'"
          :class="step === 0 ? 'btn-onboarding-light' : 'btn-primary'"
          @tap="step += 1"
        />
        <template v-else>
          <Button text="Unterstützer:in werden" class="btn-primary" @tap="finish(true)" />
          <Button text="Erstmal umsehen" class="btn-secondary mt-s" @tap="finish(false)" />
        </template>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, watch } from 'nativescript-vue';
import { $closeModal } from 'nativescript-vue';
import { interests as allInterests } from '../../data/interests';
import { useInterestsStore } from '../../stores/interests';
import { useSettingsStore } from '../../stores/settings';
import { useJoinFlow } from '../../composables/useJoinFlow';
import { useThemeForModal, isDarkAppearance } from '../../composables/useTheme';
import { setNavBarOnWindow, BRAND_RED } from '../../lib/system-bars';

useThemeForModal();
const step = ref(0);
const interestsStore = useInterestsStore();
const settings = useSettingsStore();
const { openJoinFlow } = useJoinFlow();

// The top status bar is set via the Page properties above. The bottom nav bar has
// no core property — and this is a modal with its OWN window — so set it on the
// modal's window (page.getClosestWindow()): red on the mission screen, theme
// default on later steps. The main app's nav bar is handled by AppShell.
let modalWindow: any = null;
function updateNav() {
  if (!modalWindow) return;
  if (step.value === 0) setNavBarOnWindow(modalWindow, BRAND_RED, true);
  else setNavBarOnWindow(modalWindow, isDarkAppearance.value ? '#1a1a1a' : '#ffffff', isDarkAppearance.value);
}
function onPageLoaded(args: any) {
  try {
    modalWindow = args.object?.getClosestWindow?.() ?? null;
  } catch {
    modalWindow = null;
  }
  updateNav();
}
watch(step, updateNav);

function finish(withJoin: boolean) {
  settings.completeOnboarding();
  $closeModal();
  if (withJoin) {
    // Open the join flow after closing
    setTimeout(() => openJoinFlow(), 350);
  }
}
</script>
