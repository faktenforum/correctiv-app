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
    toggle(state, action: PayloadAction<SavedArticle>) {
      const index = state.items.findIndex((a) => a.url === action.payload.url);
      if (index === -1) state.items.unshift(action.payload);
      else state.items.splice(index, 1);
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
