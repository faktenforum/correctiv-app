import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type MembershipInterval = 'monatlich' | 'jährlich';

/**
 * Club membership, held locally. Joining and payment are simulated.
 * isMember is the central demo lever: all club touchpoints must read it through
 * the binding on every render, never snapshot it into a local variable, or the
 * app-wide status flip stops being visible.
 */
export interface MembershipState {
  isMember: boolean;
  name: string;
  memberSince: string | null;
  amountEur: number;
  interval: MembershipInterval;
  paused: boolean;
}

const initialState: MembershipState = {
  isMember: false,
  name: '',
  memberSince: null,
  amountEur: 10,
  interval: 'monatlich',
  paused: false,
};

const slice = createSlice({
  name: 'membership',
  initialState,
  reducers: {
    /**
     * `joinedAt` is stamped in `prepare`, not in the reducer.
     *
     * The reducer has to keep an existing `memberSince` — rejoining does not reset
     * the date — so the decision needs state, but the clock reading does not belong
     * in a reducer at all. Splitting it this way is what keeps the reducer pure and
     * therefore replayable.
     */
    join: {
      reducer(
        state,
        action: PayloadAction<{
          amountEur: number;
          interval: MembershipInterval;
          name?: string;
          joinedAt: string;
        }>,
      ) {
        const { amountEur, interval, name, joinedAt } = action.payload;
        state.isMember = true;
        if (name) state.name = name;
        state.memberSince = state.memberSince ?? joinedAt;
        state.amountEur = amountEur;
        state.interval = interval;
        state.paused = false;
      },
      prepare: (amountEur: number, interval: MembershipInterval, name?: string) => ({
        payload: { amountEur, interval, name, joinedAt: new Date().toISOString() },
      }),
    },

    /**
     * Pausing is simulated, and it deliberately does NOT revoke membership:
     * Backstage stays open, per the concept.
     */
    setPaused(state, action: PayloadAction<boolean>) {
      state.paused = action.payload;
    },

    /** Dev helper for demo resets (settings) */
    reset() {
      return initialState;
    },

    /** Applied by persist() at startup — see stores/persist.ts. */
    hydrate(state, action: PayloadAction<Partial<MembershipState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const membershipReducer = slice.reducer;
export const membershipActions = slice.actions;
export const { join, setPaused, reset } = slice.actions;
