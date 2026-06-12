import { defineStore } from 'pinia';

export type TabId = 'home' | 'discover' | 'media' | 'participate' | 'profile';

export const PERSISTED_KEYS = ['onboardingDone', 'pushOptIn', 'textScale', 'newsletter'];

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    onboardingDone: false,
    pushOptIn: false,
    /** Skaliert die Artikel-Typografie im Reader (Profil → Einstellungen). */
    textScale: 1,
    newsletter: {
      spotlight: false,
      spotlightCh: false,
      klima: false,
    },
    // Flüchtiger Shell-Zustand (nicht persistiert)
    activeTab: 'home' as TabId,
    visitedTabs: ['home'] as TabId[],
  }),
  actions: {
    setActiveTab(tab: TabId) {
      this.activeTab = tab;
      if (!this.visitedTabs.includes(tab)) this.visitedTabs.push(tab);
    },
    completeOnboarding() {
      this.onboardingDone = true;
    },
  },
});
