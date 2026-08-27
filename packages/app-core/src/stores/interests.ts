import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { interests, type Interest } from '../data/interests';

/**
 * State and actions only. Derived values are exported as PURE FUNCTIONS OF STATE
 * below rather than bundled into the slice, and that is load-bearing rather than
 * stylistic: taking state as an argument lets each binding apply the selector to
 * its own tracked view — `useSelector` here, a `computed` in a Vue host — instead
 * of reading through a store instance the reactivity system never saw.
 */
export interface InterestsState {
  selected: string[];
}

const initialState: InterestsState = { selected: [] };

/** The full interest objects for the selected ids. */
export function selectedInterests(state: InterestsState): Interest[] {
  return interests.filter((i) => state.selected.includes(i.id));
}

/** Modules that move up due to interests (home personalisation). */
export function boostedModules(state: InterestsState): string[] {
  return selectedInterests(state)
    .map((i) => i.boostModule)
    .filter((m): m is NonNullable<Interest['boostModule']> => !!m);
}

/** Feeds from which Home shows additional sections. */
export function extraFeeds(state: InterestsState): Interest[] {
  return selectedInterests(state).filter((i) => i.feed && i.feed !== 'salon5');
}

const slice = createSlice({
  name: 'interests',
  initialState,
  reducers: {
    toggle(state, action: PayloadAction<string>) {
      const index = state.selected.indexOf(action.payload);
      if (index === -1) state.selected.push(action.payload);
      else state.selected.splice(index, 1);
    },

    /** Demo reset (Settings → Demo). */
    clear(state) {
      state.selected = [];
    },

    /** Applied by persist() at startup — see stores/persist.ts. */
    hydrate(state, action: PayloadAction<Partial<InterestsState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const interestsReducer = slice.reducer;
export const interestsActions = slice.actions;
export const { toggle, clear } = slice.actions;
