<template>
  <GridLayout columns="*, *, *, *, *" class="tab-bar hairline-top">
    <StackLayout
      v-for="(tab, index) in tabs"
      :key="tab.id"
      :col="index"
      class="tab-item"
      @tap="$emit('select', tab.id)"
    >
      <Label :text="tab.icon" class="tab-icon" :class="{ 'tab-active': activeTab === tab.id }" />
      <Label :text="tab.label" class="tab-label" :class="{ 'tab-active': activeTab === tab.id }" />
    </StackLayout>
  </GridLayout>
</template>

<script setup lang="ts">
import { icons } from '../../ui/icons';
import type { TabId } from '../../stores/settings';

defineProps<{ activeTab: TabId }>();
defineEmits<{ (e: 'select', tab: TabId): void }>();

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: icons.house },
  { id: 'discover', label: 'Entdecken', icon: icons.compass },
  { id: 'media', label: 'Mediathek', icon: icons.monitorPlay },
  { id: 'participate', label: 'Mitmachen', icon: icons.megaphone },
  { id: 'profile', label: 'Profil', icon: icons.userRound },
];
</script>

<!-- Kein <style>-Block: @nativescript/vite 2.0.3 extrahiert SFC-Styles in eine CSS-Datei,
     die zur Laufzeit nie angewendet wird. Alle Styles leben in src/styles/ (via app.scss). -->

