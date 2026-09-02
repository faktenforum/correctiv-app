import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { sessionActions } from './session';

export type MembershipInterval = 'monatlich' | 'jährlich';

/**
 * The simulated contribution, and nothing else about the person.
 *
 * Who is signed in, and whether the app is open to them, is `stores/session`: the
 * name on the profile comes from `session.account`, the door reads the entitlement.
 * This slice holds only what the in-app join flow simulates, a contribution the
 * membership system will own once it answers with one.
 *
 * It used to hold `name` and `isMember` as well, and behind the door both were dead.
 * `name` could never win against `session.account.name`, which is never empty;
 * `isMember` was true in exactly the states `memberSince !== null` is, so it is a
 * selector now rather than a second stored answer that can disagree with the first.
 */
export interface MembershipState {
  /** Stamped by the first simulated join; null until then. */
  memberSince: string | null;
  amountEur: number;
  interval: MembershipInterval;
  paused: boolean;
}

/** What survives a restart. Declared here, beside the state, as `session` does. */
export const PERSISTED_KEYS = ['memberSince', 'amountEur', 'interval', 'paused'] satisfies Array<
  keyof MembershipState
>;

const initialState: MembershipState = {
  memberSince: null,
  amountEur: 10,
  interval: 'monatlich',
  paused: false,
};

/**
 * Whether the simulated join has run.
 *
 * A selector rather than a stored flag, and what it replaces says why it matters:
 * the amount defaults to 10, so a screen printing it unconditionally invents a
 * contribution for every account that never set one, including a trial paying 0 €.
 */
export function hasSimulatedJoin(state: MembershipState): boolean {
  return state.memberSince !== null;
}

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
          joinedAt: string;
        }>,
      ) {
        const { amountEur, interval, joinedAt } = action.payload;
        state.memberSince = state.memberSince ?? joinedAt;
        state.amountEur = amountEur;
        state.interval = interval;
        state.paused = false;
      },
      prepare: (amountEur: number, interval: MembershipInterval) => ({
        payload: { amountEur, interval, joinedAt: new Date().toISOString() },
      }),
    },

    /** Pausing is simulated. Nothing inside the app closes when it is set. */
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
  extraReducers: (builder) => {
    /**
     * A contribution belongs to the account that set it, not to the device.
     * `signOut` used to clear only the session, so the next person to sign in on
     * this phone inherited the previous one's amount and join date: their name and
     * tier on the card, someone else's date and amount under it.
     */
    builder.addCase(sessionActions.signOut, () => initialState);
  },
});

export const membershipReducer = slice.reducer;
export const membershipActions = slice.actions;
export const { join, setPaused, reset } = slice.actions;
