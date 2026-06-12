import { defineStore } from 'pinia';

/**
 * Club-Mitgliedschaft — lokaler State (Prototyp simuliert Beitritt/Zahlung).
 * isMember ist der zentrale Demo-Hebel: alle Club-Touchpoints lesen ihn
 * reaktiv im Template-Renderpfad (NIE in lokale refs snapshotten!).
 */
export const useMembershipStore = defineStore('membership', {
  state: () => ({
    isMember: false,
    memberSince: null as string | null,
    amountEur: 10,
    interval: 'monatlich' as 'monatlich' | 'jährlich',
    paused: false,
  }),
  actions: {
    join(amountEur: number, interval: 'monatlich' | 'jährlich') {
      this.isMember = true;
      this.memberSince = this.memberSince ?? new Date().toISOString();
      this.amountEur = amountEur;
      this.interval = interval;
      this.paused = false;
    },
    /** Dev-Helfer für Demo-Resets (Einstellungen) */
    reset() {
      this.isMember = false;
      this.memberSince = null;
      this.amountEur = 10;
      this.interval = 'monatlich';
      this.paused = false;
    },
  },
});
