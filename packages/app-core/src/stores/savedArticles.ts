import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { FactcheckRating } from '../articles/types';

export interface SavedArticle {
  url: string;
  title: string;
  /** Section or verdict badge, as the reader showed it. */
  kicker: string | null;
  rating: FactcheckRating | null;
  savedAt: string;
}

export interface SavedArticlesState {
  items: SavedArticle[];
}

const initialState: SavedArticlesState = { items: [] };

/** Pure selector — see the note in stores/interests.ts for why not part of the slice. */
export function isSaved(state: SavedArticlesState, url: string): boolean {
  return state.items.some((a) => a.url === url);
}

const slice = createSlice({
  name: 'savedArticles',
  initialState,
  reducers: {
    /**
     * Filtering rather than splicing the first hit, so that toggle and `remove`
     * agree: both drop EVERY entry with that url. A duplicate cannot get in
     * through this action, but a persisted payload from an older version could,
     * and then a splice would leave the article saved and its star lit.
     */
    toggle(state, action: PayloadAction<SavedArticle>) {
      const saved = state.items.some((a) => a.url === action.payload.url);
      state.items = saved
        ? state.items.filter((a) => a.url !== action.payload.url)
        : [action.payload, ...state.items];
    },

    remove(state, action: PayloadAction<string>) {
      state.items = state.items.filter((a) => a.url !== action.payload);
    },

    /** Applied by persist() at startup — see stores/persist.ts. */
    hydrate(state, action: PayloadAction<Partial<SavedArticlesState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const savedArticlesReducer = slice.reducer;
export const savedArticlesActions = slice.actions;
export const { toggle, remove } = slice.actions;
