<template>
  <!-- When a video is expanded, Row 0 (tab frames) collapses to 0 so the
       persistent video player fills the screen; the tab bar stays. -->
  <GridLayout :rows="videoStore.expanded ? '0, *, auto' : '*, auto, auto'" class="bg-grey-100">
    <!-- Row 0: frame-per-tab — lazily mounted, never destroyed (preserves stacks,
         scroll positions and keeps all screens mounted for the status flip) -->
    <GridLayout row="0">
      <template v-for="tab in tabDefs" :key="tab.id">
        <Frame
          v-if="settings.visitedTabs.includes(tab.id)"
          :id="`tab-${tab.id}`"
          :visibility="settings.activeTab === tab.id ? 'visible' : 'collapsed'"
        >
          <component :is="tab.page" />
        </Frame>
      </template>
    </GridLayout>

    <!-- Row 1: persistent player — audio mini player OR the video player.
         They coordinate (one medium at a time), so only one is ever active. -->
    <MiniPlayer v-if="audioStore.isActive && !videoStore.isActive" row="1" />
    <UnifiedPlayer v-if="videoStore.isActive" row="1" />

    <!-- Row 2: tab bar -->
    <TabBar row="2" :activeTab="settings.activeTab" @select="settings.setActiveTab" />

    <!-- Global bottom sheet: invitation after the 60s preview (above all rows) -->
    <ClubInviteSheet v-if="audioStore.previewEnded" row="0" rowSpan="3" />
  </GridLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'nativescript-vue';
import { $showModal } from 'nativescript-vue';
import TabBar from './components/shell/TabBar.vue';
import MiniPlayer from './components/shell/MiniPlayer.vue';
import UnifiedPlayer from './components/shell/UnifiedPlayer.vue';
import OnboardingModal from './views/modals/OnboardingModal.vue';
import ClubInviteSheet from './components/sheets/ClubInviteSheet.vue';
import { useAudioStore } from './stores/audio';
import { useVideoStore } from './stores/video';
import HomePage from './views/home/HomePage.vue';
import DiscoverPage from './views/discover/DiscoverPage.vue';
import MediaPage from './views/media/MediaPage.vue';
import ParticipatePage from './views/participate/ParticipatePage.vue';
import ProfilePage from './views/profile/ProfilePage.vue';
import { useSettingsStore, type TabId } from './stores/settings';
import { useThemeController } from './composables/useTheme';

const settings = useSettingsStore();
const audioStore = useAudioStore();
const videoStore = useVideoStore();

// Dark mode: the controller applies the `.ns-dark`/`.ns-light` class to the
// actual root view (and modal roots) from the in-app setting, overriding the OS
// appearance — see composables/useTheme.ts for why a nested :class can't.
useThemeController();

onMounted(() => {
  if (!settings.onboardingDone) {
    // briefly delayed until the shell is rendered — otherwise the modal host is missing
    setTimeout(() => $showModal(OnboardingModal, { fullscreen: true }), 250);
  }
});

const tabDefs: { id: TabId; page: unknown }[] = [
  { id: 'home', page: HomePage },
  { id: 'discover', page: DiscoverPage },
  { id: 'media', page: MediaPage },
  { id: 'participate', page: ParticipatePage },
  { id: 'profile', page: ProfilePage },
];
</script>
