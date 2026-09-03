import type { Account, Entitlement } from '../types/models';

/**
 * Sign-in against the membership system, SIMULATED.
 *
 * What this stands in for: one login for website and app, answered by beabee with
 * the tier, whether the app is included, why, and for how long (the C1 dependency
 * in the scope). Nothing here reaches a network, and the screen that calls it says
 * so. The shape of the answer is the contract; the rules below exist so that every
 * state of the door can be reached in a demo without a backend, and the door
 * prints them.
 *
 *  - a password shorter than four characters fails, as a wrong one would;
 *  - "frei" in the address answers with the 0 € tier: signed in, no app access;
 *  - "test" answers with a trial: the paid tier, app access, thirty days;
 *  - "lokal" answers with a local-newsletter bundle, which includes the app;
 *  - "soli" answers with the Soli tier;
 *  - anything else is a paying member.
 *
 * `unreachable` is what the real client answers when correctiv.org does not; the
 * simulation never produces it, but the door already knows what to say.
 */
export type SignInFailure = 'wrong-credentials' | 'unreachable';

export type SignInResult =
  | { ok: true; account: Account; entitlement: Entitlement }
  | { ok: false; reason: SignInFailure };

export interface AuthOptions {
  /** The clock, for the trial's end date. Injected so a test can pin it. */
  now?: number;
  /** How long the round trip pretends to take. Long enough to be seen. */
  delayMs?: number;
}

/** Long enough that "wir prüfen Ihre Mitgliedschaft" is read, not flashed. */
export const SIGN_IN_DELAY_MS = 1500;

export const MIN_PASSWORD_LENGTH = 4;

const TRIAL_DAYS = 30;

/**
 * The join date every simulated account carries.
 *
 * Fixed rather than derived from the clock, because `refreshEntitlement` may build an
 * entitlement a second time and a date read from `now` would then move: the profile
 * would print a membership that got younger while the app was open. The real date
 * comes from beabee with everything else in this answer.
 */
export const SIMULATED_MEMBER_SINCE = '2026-03-04T09:12:00.000Z';

/** "alex.beispiel@…" → "Alex Beispiel". A demo needs a name to greet with. */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1));
  return words.join(' ') || 'Mitglied';
}

/**
 * The entitlement the simulated directory holds for an address.
 *
 * `upgraded` is the door's re-check after the upgrade page was opened: the real
 * system would find the new contribution, so the simulation grants the paid tier.
 */
export function simulatedEntitlement(
  email: string,
  { now = Date.now(), upgraded = false }: { now?: number; upgraded?: boolean } = {},
): Entitlement {
  const address = email.toLowerCase();
  const fullAccess: Entitlement = {
    tier: 'paid',
    appAccess: true,
    source: 'paid',
    validUntil: null,
    localAreas: [],
    memberSince: SIMULATED_MEMBER_SINCE,
  };
  if (upgraded) return fullAccess;
  if (address.includes('frei')) {
    return {
      tier: 'free',
      appAccess: false,
      source: null,
      validUntil: null,
      localAreas: [],
      memberSince: SIMULATED_MEMBER_SINCE,
    };
  }
  if (address.includes('test')) {
    return {
      ...fullAccess,
      source: 'trial',
      validUntil: new Date(now + TRIAL_DAYS * 864e5).toISOString(),
    };
  }
  if (address.includes('lokal')) {
    return { ...fullAccess, source: 'local-bundle', localAreas: ['Gelsenkirchen'] };
  }
  if (address.includes('soli')) return { ...fullAccess, tier: 'soli' };
  return fullAccess;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulatedSignIn(
  email: string,
  password: string,
  { now = Date.now(), delayMs = SIGN_IN_DELAY_MS }: AuthOptions = {},
): Promise<SignInResult> {
  await wait(delayMs);
  const address = email.trim();
  if (!address.includes('@') || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: 'wrong-credentials' };
  }
  return {
    ok: true,
    account: { email: address, name: nameFromEmail(address) },
    entitlement: simulatedEntitlement(address, { now }),
  };
}
