<template>
  <GridLayout rows="*, auto, auto" class="bg-grey-100">
    <!-- Zeile 0: Frame pro Tab — lazy gemountet, nie zerstört (erhält Stacks,
         Scroll-Positionen und hält alle Screens für den Status-Flip gemountet) -->
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

    <!-- Zeile 1: persistenter Audio-Mini-Player — sichtbar in allen Tabs -->
    <MiniPlayer v-if="audioStore.isActive" row="1" />

    <!-- Zeile 2: Tab-Bar -->
    <TabBar row="2" :activeTab="settings.activeTab" @select="settings.setActiveTab" />
  </GridLayout>
</template>

<script setup lang="ts">
import TabBar from './components/shell/TabBar.vue';
import MiniPlayer from './components/shell/MiniPlayer.vue';
import { useAudioStore } from './stores/audio';
import HomePage from './views/home/HomePage.vue';
import DiscoverPage from './views/discover/DiscoverPage.vue';
import MediaPage from './views/media/MediaPage.vue';
import ParticipatePage from './views/participate/ParticipatePage.vue';
import ProfilePage from './views/profile/ProfilePage.vue';
import { useSettingsStore, type TabId } from './stores/settings';

const settings = useSettingsStore();
const audioStore = useAudioStore();

const tabDefs: { id: TabId; page: unknown }[] = [
  { id: 'home', page: HomePage },
  { id: 'discover', page: DiscoverPage },
  { id: 'media', page: MediaPage },
  { id: 'participate', page: ParticipatePage },
  { id: 'profile', page: ProfilePage },
];
</script>
