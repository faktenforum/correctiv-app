import { createStore } from './create-store';
import { interests, type Interest } from '../data/interests';

/**
 * State and actions only. Derived values are exported as PURE FUNCTIONS OF STATE
 * below rather than methods on the store, and that is load-bearing rather than
 * stylistic: a method would close over the vanilla store's own `get()`, so a Vue
 * `computed` calling it would read state the reactivity system never saw and the
 * template would silently stop updating. Taking state as an argument lets each
 * binding apply the selector to its own tracked view.
 */
export interface InterestsState {
  selected: string[];
  toggle: (id: string) => void;
}

/** The full interest objects for the selected ids. */
export function selectedInterests(state: Pick<InterestsState, 'selected'>): Interest[] {
  return interests.filter((i) => state.selected.includes(i.id));
}

/** Modules that move up due to interests (home personalisation). */
export function boostedModules(state: Pick<InterestsState, 'selected'>): string[] {
  return selectedInterests(state)
    .map((i) => i.boostModule)
    .filter((m): m is NonNullable<Interest['boostModule']> => !!m);
}

/** Feeds from which Home shows additional sections. */
export function extraFeeds(state: Pick<InterestsState, 'selected'>): Interest[] {
  return selectedInterests(state).filter((i) => i.feed && i.feed !== 'salon5');
}

export const interestsStore = createStore<InterestsState>((set) => ({
  selected: [],

  toggle: (id) =>
    set((state) => ({
      selected: state.selected.includes(id)
        ? state.selected.filter((s) => s !== id)
        : [...state.selected, id],
    })),
}));
