import { defineStore } from 'pinia';

/**
 * Locally persisted participation state: callout submissions (incrementing the
 * visible counter is part of the demo magic) and submitted Faktenforum hints.
 */
export interface CalloutSubmission {
  calloutSlug: string;
  answers: Record<string, unknown>;
  submittedAt: string;
}

export const useParticipationStore = defineStore('participation', {
  state: () => ({
    submissions: [] as CalloutSubmission[],
  }),
  getters: {
    hasSubmitted: (state) => (slug: string) =>
      state.submissions.some((s) => s.calloutSlug === slug),
    /** Locally added responses on top of the sample base count */
    extraCount: (state) => (slug: string) =>
      state.submissions.filter((s) => s.calloutSlug === slug).length,
  },
  actions: {
    submit(calloutSlug: string, answers: Record<string, unknown>) {
      this.submissions.push({ calloutSlug, answers, submittedAt: new Date().toISOString() });
    },
  },
});
