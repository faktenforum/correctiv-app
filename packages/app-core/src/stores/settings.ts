import { createStore } from './create-store';

export type TabId = 'home' | 'discover' | 'media' | 'participate' | 'profile';
export type ThemePreference = 'system' | 'light' | 'dark';

export const PERSISTED_KEYS = ['onboardingDone', 'pushOptIn', 'textScale', 'newsletter', 'theme'];

export interface SettingsState {
  onboardingDone: boolean;
  pushOptIn: boolean;
  /** Scales the article typography in the reader (Profile → Settings). */
  textScale: number;
  newsletter: {
    spotlight: boolean;
    spotlightCh: boolean;
    klima: boolean;
  };
  /** Theme preference (Profile → Darstellung). 'system' follows the OS. */
  theme: ThemePreference;
  // Ephemeral shell state (not persisted)
  activeTab: TabId;
  visitedTabs: TabId[];

  setActiveTab: (tab: TabId) => void;
  completeOnboarding: () => void;
  setTheme: (theme: ThemePreference) => void;
}

export const settingsStore = createStore<SettingsState>((set) => ({
  onboardingDone: false,
  pushOptIn: false,
  textScale: 1,
  newsletter: {
    spotlight: false,
    spotlightCh: false,
    klima: false,
  },
  theme: 'system',
  activeTab: 'home',
  visitedTabs: ['home'],

  setActiveTab: (tab) =>
    set((state) => ({
      activeTab: tab,
      visitedTabs: state.visitedTabs.includes(tab)
        ? state.visitedTabs
        : [...state.visitedTabs, tab],
    })),
  completeOnboarding: () => set({ onboardingDone: true }),
  setTheme: (theme) => set({ theme }),
}));
