import { createStore } from './create-store';

export interface SavedArticle {
  url: string;
  title: string;
  topline: string | null;
  rating: string | null;
  savedAt: string;
}

export interface SavedArticlesState {
  items: SavedArticle[];
  toggle: (article: SavedArticle) => void;
  remove: (url: string) => void;
}

/** Pure selector — see the note in stores/interests.ts for why not a method. */
export function isSaved(state: Pick<SavedArticlesState, 'items'>, url: string): boolean {
  return state.items.some((a) => a.url === url);
}

export const savedArticlesStore = createStore<SavedArticlesState>((set) => ({
  items: [],

  toggle: (article) =>
    set((state) =>
      state.items.some((a) => a.url === article.url)
        ? { items: state.items.filter((a) => a.url !== article.url) }
        : { items: [article, ...state.items] },
    ),
  remove: (url) => set((state) => ({ items: state.items.filter((a) => a.url !== url) })),
}));
