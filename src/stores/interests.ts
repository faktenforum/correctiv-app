import { defineStore } from 'pinia';
import { interests, type Interest } from '../data/interests';

export const useInterestsStore = defineStore('interests', {
  state: () => ({
    selected: [] as string[],
  }),
  getters: {
    selectedInterests(state): Interest[] {
      return interests.filter((i) => state.selected.includes(i.id));
    },
    /** Module, die durch Interessen nach oben rücken (Home-Personalisierung) */
    boostedModules(): string[] {
      return this.selectedInterests
        .map((i) => i.boostModule)
        .filter((m): m is NonNullable<Interest['boostModule']> => !!m);
    },
    /** Feeds, aus denen Home zusätzliche Sektionen zeigt */
    extraFeeds(): Interest[] {
      return this.selectedInterests.filter((i) => i.feed && i.feed !== 'salon5');
    },
  },
  actions: {
    toggle(id: string) {
      const index = this.selected.indexOf(id);
      if (index >= 0) this.selected.splice(index, 1);
      else this.selected.push(id);
    },
  },
});
