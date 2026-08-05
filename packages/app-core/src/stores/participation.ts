import { createStore } from 'zustand/vanilla';

/**
 * Locally persisted participation state: callout submissions (incrementing the
 * visible counter is part of the demo magic) and submitted Faktenforum hints.
 */
export interface CalloutSubmission {
  calloutSlug: string;
  answers: Record<string, unknown>;
  submittedAt: string;
}

export interface ParticipationState {
  submissions: CalloutSubmission[];
  submit: (calloutSlug: string, answers: Record<string, unknown>) => void;
}

type Submissions = Pick<ParticipationState, 'submissions'>;

/** Pure selectors — see the note in stores/interests.ts for why not methods. */
export function hasSubmitted(state: Submissions, slug: string): boolean {
  return state.submissions.some((s) => s.calloutSlug === slug);
}

/** Locally added responses on top of the sample base count. */
export function extraCount(state: Submissions, slug: string): number {
  return state.submissions.filter((s) => s.calloutSlug === slug).length;
}

export const participationStore = createStore<ParticipationState>()((set) => ({
  submissions: [],

  submit: (calloutSlug, answers) =>
    set((state) => ({
      submissions: [
        ...state.submissions,
        { calloutSlug, answers, submittedAt: new Date().toISOString() },
      ],
    })),
}));
