import { createStore } from './create-store';

export type MembershipInterval = 'monatlich' | 'jährlich';

/**
 * Club membership — local state (the prototype simulates joining/payment).
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

  join: (amountEur: number, interval: MembershipInterval, name?: string) => void;
  /**
   * Pausing is simulated, and it deliberately does NOT revoke membership:
   * Backstage stays open, per the concept. The Vue host used to assign
   * `membership.paused` directly through its reactive mirror — a store that owns
   * its transitions needs the action, and both hosts read the same rule from it.
   */
  setPaused: (paused: boolean) => void;
  /** Dev helper for demo resets (settings) */
  reset: () => void;
}

const INITIAL = {
  isMember: false,
  name: '',
  memberSince: null as string | null,
  amountEur: 10,
  interval: 'monatlich' as MembershipInterval,
  paused: false,
};

export const membershipStore = createStore<MembershipState>((set, get) => ({
  ...INITIAL,

  join: (amountEur, interval, name) =>
    set({
      isMember: true,
      ...(name ? { name } : {}),
      memberSince: get().memberSince ?? new Date().toISOString(),
      amountEur,
      interval,
      paused: false,
    }),
  setPaused: (paused) => set({ paused }),
  reset: () => set({ ...INITIAL }),
}));
