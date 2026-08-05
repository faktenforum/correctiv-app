import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SavedArticle {
  url: string;
  title: string;
  savedAt: string;
}

interface SavedState {
  items: SavedArticle[];
  isSaved: (url: string) => boolean;
  toggle: (article: { url: string; title: string }) => void;
  remove: (url: string) => void;
}

/** Gespeicherte Artikel (persistiert). Genutzt im Reader und im Profil (M5). */
export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],
      isSaved: (url) => get().items.some((i) => i.url === url),
      toggle: ({ url, title }) =>
        set((state) =>
          state.items.some((i) => i.url === url)
            ? { items: state.items.filter((i) => i.url !== url) }
            : { items: [{ url, title, savedAt: new Date().toISOString() }, ...state.items] },
        ),
      remove: (url) => set((state) => ({ items: state.items.filter((i) => i.url !== url) })),
    }),
    {
      name: 'saved-articles',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
