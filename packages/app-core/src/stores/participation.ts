import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: ParticipationState = { submissions: [] };

/** Pure selectors — see the note in stores/interests.ts for why not part of the slice. */
export function hasSubmitted(state: ParticipationState, slug: string): boolean {
  return state.submissions.some((s) => s.calloutSlug === slug);
}

/** Locally added responses on top of the sample base count. */
export function extraCount(state: ParticipationState, slug: string): number {
  return state.submissions.filter((s) => s.calloutSlug === slug).length;
}

const slice = createSlice({
  name: 'participation',
  initialState,
  reducers: {
    /** `submittedAt` is stamped in `prepare` — the reducer stays pure. */
    submit: {
      reducer(state, action: PayloadAction<CalloutSubmission>) {
        state.submissions.push(action.payload);
      },
      prepare: (calloutSlug: string, answers: Record<string, unknown>) => ({
        payload: { calloutSlug, answers, submittedAt: new Date().toISOString() },
      }),
    },

    /** Applied by persist() at startup — see stores/persist.ts. */
    hydrate(state, action: PayloadAction<Partial<ParticipationState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const participationReducer = slice.reducer;
export const participationActions = slice.actions;
export const { submit } = slice.actions;
