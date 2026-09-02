import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  simulatedEntitlement,
  simulatedSignIn,
  type AuthOptions,
  type SignInFailure,
} from '../services/auth.service';
import type { Account, Entitlement } from '../types/models';
import type { AppThunk } from './store';

/**
 * Who is signed in, and whether the app is open to them.
 *
 * This is what the door in the host's root layout reads, and it is a slice of its
 * own rather than a field on `membership` for one reason: `membership` is the
 * demo's club lever, a simulated contribution that every club touchpoint reacts
 * to, and the door must not depend on it. The scope makes the point concrete. A
 * member in a trial month pays 0 € and has the app; a 0 € member outside a trial
 * does not. Nothing about that is readable off an amount, so the door reads the
 * entitlement the membership system answered with, and only that.
 *
 * The four states the door renders are the four values of `status`, with
 * `signed-in` splitting once more on the entitlement (see `accessShortfall`).
 * `signing-in` and `failed` are never persisted: a restart starts signed out or
 * signed in, never mid-request.
 */
export type SessionStatus = 'signed-out' | 'signing-in' | 'failed' | 'signed-in';

export interface SessionState {
  status: SessionStatus;
  account: Account | null;
  entitlement: Entitlement | null;
  /** Why the last attempt failed; cleared on the next one. */
  failure: SignInFailure | null;
  /** The upgrade page was opened from the door. The simulated re-check reads it. */
  upgradeStarted: boolean;
}

/** What survives a restart. `status` is derived from `account` on hydration. */
export const PERSISTED_KEYS = ['account', 'entitlement'] satisfies Array<keyof SessionState>;

const initialState: SessionState = {
  status: 'signed-out',
  account: null,
  entitlement: null,
  failure: null,
  upgradeStarted: false,
};

const slice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    started(state) {
      state.status = 'signing-in';
      state.failure = null;
    },

    succeeded(state, action: PayloadAction<{ account: Account; entitlement: Entitlement }>) {
      state.status = 'signed-in';
      state.account = action.payload.account;
      state.entitlement = action.payload.entitlement;
      state.failure = null;
      state.upgradeStarted = false;
    },

    failed(state, action: PayloadAction<SignInFailure>) {
      state.status = 'failed';
      state.failure = action.payload;
    },

    /** A fresh answer from the membership system for the account already signed in. */
    entitlementChecked(state, action: PayloadAction<Entitlement>) {
      state.entitlement = action.payload;
    },

    upgradeStarted(state) {
      state.upgradeStarted = true;
    },

    signOut() {
      return initialState;
    },

    /**
     * Applied by persist() at startup, see stores/persist.ts. Only `account` and
     * `entitlement` are stored, so the status is what having an account means.
     */
    hydrate(state, action: PayloadAction<Partial<SessionState>>) {
      Object.assign(state, action.payload);
      state.status = state.account ? 'signed-in' : 'signed-out';
    },
  },
});

export const sessionReducer = slice.reducer;
export const sessionActions = slice.actions;
export const { signOut, upgradeStarted } = slice.actions;

// --- selectors ------------------------------------------------------------------

/**
 * Whether an entitlement opens the app right now.
 *
 * `now` is a parameter, not a `Date.now()` inside: the selector stays pure and a
 * test can put the clock past a trial's end. A `validUntil` in the past lapses the
 * access even though `appAccess` is still true, which is the trial month ending.
 */
export function hasAppAccess(entitlement: Entitlement | null, now: number): boolean {
  if (!entitlement?.appAccess) return false;
  return entitlement.validUntil === null || Date.parse(entitlement.validUntil) > now;
}

/** The door's one question. */
export function isAdmitted(session: SessionState, now: number): boolean {
  return session.status === 'signed-in' && hasAppAccess(session.entitlement, now);
}

/**
 * Why a signed-in account is not admitted, or null when it is (or nobody is signed
 * in). `lapsed` is a trial whose end date has passed; `tier` is every other case,
 * which today means the 0 € membership.
 */
export type AccessShortfall = 'tier' | 'lapsed';

export function accessShortfall(session: SessionState, now: number): AccessShortfall | null {
  if (session.status !== 'signed-in' || isAdmitted(session, now)) return null;
  const entitlement = session.entitlement;
  const lapsed =
    entitlement?.appAccess === true &&
    entitlement.validUntil !== null &&
    Date.parse(entitlement.validUntil) <= now;
  return lapsed ? 'lapsed' : 'tier';
}

// --- thunks ---------------------------------------------------------------------

/**
 * Signs in. State first, then the request, then the answer, so the door shows
 * `signing-in` for the length of the round trip and lands on exactly one of
 * `signed-in` or `failed`.
 */
export const signIn =
  (email: string, password: string, options: AuthOptions = {}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(slice.actions.started());
    const result = await simulatedSignIn(email, password, options);
    if (result.ok) {
      dispatch(
        slice.actions.succeeded({ account: result.account, entitlement: result.entitlement }),
      );
    } else {
      dispatch(slice.actions.failed(result.reason));
    }
  };

/**
 * Asks the membership system again, for the account already signed in. The real
 * flow this serves: someone upgrades on correctiv.org, comes back to the app and
 * taps "Erneut prüfen". The simulation grants the upgrade once the upgrade page
 * has been opened from the door, and answers the same thing as before otherwise.
 */
export const refreshEntitlement =
  (options: AuthOptions = {}): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const { account, entitlement, upgradeStarted: upgraded } = getState().session;
    if (!account) return;
    /**
     * Without an upgrade the answer is the one already held, and it is re-dispatched
     * rather than re-derived. Deriving it again looks equivalent and is not: the
     * simulation dates a trial from the `now` it is given, so every re-check handed a
     * lapsed trial another 30 days and "Erneut prüfen" became a renew button. The
     * entitlement is the membership system's answer, so the app keeps it until that
     * system answers differently.
     */
    const next = upgraded
      ? simulatedEntitlement(account.email, { now: options.now, upgraded })
      : (entitlement ?? simulatedEntitlement(account.email, { now: options.now }));
    dispatch(slice.actions.entitlementChecked(next));
  };
