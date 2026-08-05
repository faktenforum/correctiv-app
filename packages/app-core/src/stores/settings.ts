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
  /** One newsletter subscription. Keyed, so a host cannot invent a fourth list. */
  setNewsletter: (key: NewsletterKey, subscribed: boolean) => void;
  setTextScale: (scale: number) => void;
  setPushOptIn: (optIn: boolean) => void;
  /** Demo reset (Settings → Demo): back to a first-launch app. */
  resetForDemo: () => void;
}

export type NewsletterKey = keyof SettingsState['newsletter'];

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

  setNewsletter: (key, subscribed) =>
    set((state) => ({ newsletter: { ...state.newsletter, [key]: subscribed } })),
  setTextScale: (textScale) => set({ textScale }),
  setPushOptIn: (pushOptIn) => set({ pushOptIn }),

  /**
   * The demo reset has to leave the app as if it were freshly installed, so it
   * also clears what the NativeScript settings page cleared by hand: onboarding,
   * push, and the interests. Membership and interests live in their own stores —
   * the caller resets those; this one owns only its own keys.
   */
  resetForDemo: () =>
    set({ onboardingDone: false, pushOptIn: false, textScale: 1, theme: 'system' }),
}));
