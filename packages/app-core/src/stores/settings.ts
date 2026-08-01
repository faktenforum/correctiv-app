import { defineStore } from 'pinia';

export type TabId = 'home' | 'discover' | 'media' | 'participate' | 'profile';

export const PERSISTED_KEYS = ['onboardingDone', 'pushOptIn', 'textScale', 'newsletter', 'theme'];

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    onboardingDone: false,
    pushOptIn: false,
    /** Scales the article typography in the reader (Profile → Settings). */
    textScale: 1,
    newsletter: {
      spotlight: false,
      spotlightCh: false,
      klima: false,
    },
    /** Theme preference (Profile → Darstellung). 'system' follows the OS. */
    theme: 'system' as 'system' | 'light' | 'dark',
    // Ephemeral shell state (not persisted)
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
    setTheme(theme: 'system' | 'light' | 'dark') {
      this.theme = theme;
    },
  },
});
