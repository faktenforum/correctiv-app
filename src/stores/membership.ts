import { defineStore } from 'pinia';

/**
 * Club membership — local state (the prototype simulates joining/payment).
 * isMember is the central demo lever: all club touchpoints read it
 * reactively in the template render path (NEVER snapshot it into local refs!).
 */
export const useMembershipStore = defineStore('membership', {
  state: () => ({
    isMember: false,
    name: '' as string,
    memberSince: null as string | null,
    amountEur: 10,
    interval: 'monatlich' as 'monatlich' | 'jährlich',
    paused: false,
  }),
  actions: {
    join(amountEur: number, interval: 'monatlich' | 'jährlich', name?: string) {
      this.isMember = true;
      if (name) this.name = name;
      this.memberSince = this.memberSince ?? new Date().toISOString();
      this.amountEur = amountEur;
      this.interval = interval;
      this.paused = false;
    },
    /** Dev helper for demo resets (settings) */
    reset() {
      this.isMember = false;
      this.name = '';
      this.memberSince = null;
      this.amountEur = 10;
      this.interval = 'monatlich';
      this.paused = false;
    },
  },
});
