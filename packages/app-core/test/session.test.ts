import { beforeEach, describe, expect, it } from 'vitest';

import { configurePlatform, createMemoryPlatform, resetPlatform } from '../src/ports';
import { nameFromEmail, simulatedEntitlement } from '../src/services/auth.service';
import { persist, persisted } from '../src/stores/persist';
import {
  accessShortfall,
  hasAppAccess,
  isAdmitted,
  PERSISTED_KEYS,
  refreshEntitlement,
  sessionActions,
  signIn,
  signOut,
  upgradeStarted,
  type SessionState,
} from '../src/stores/session';
import { createAppStore, type AppStore } from '../src/stores/store';
import type { Entitlement } from '../src/types/models';

/**
 * The door's slice. What these pin: the door reads an entitlement and never an
 * amount, a trial month opens the app and its end closes it again, and nothing
 * transient survives a restart.
 */
const NOW = Date.parse('2026-09-02T12:00:00.000Z');
const fast = { now: NOW, delayMs: 0 };

let store: AppStore;

beforeEach(() => {
  store = createAppStore();
  resetPlatform();
});

const session = () => store.getState().session;

describe('signing in (simulated)', () => {
  it('starts signed out and stays out until something answers', () => {
    expect(session().status).toBe('signed-out');
    expect(isAdmitted(session(), NOW)).toBe(false);
  });

  it('passes through signing-in and lands on signed-in with a paid entitlement', async () => {
    const pending = store.dispatch(signIn('alex.beispiel@example.org', 'geheim', fast));
    // State first, then the request: the door shows this for the whole round trip.
    expect(session().status).toBe('signing-in');
    await pending;

    expect(session()).toMatchObject({
      status: 'signed-in',
      account: { email: 'alex.beispiel@example.org', name: 'Alex Beispiel' },
      entitlement: { tier: 'paid', appAccess: true, source: 'paid', validUntil: null },
    });
    expect(isAdmitted(session(), NOW)).toBe(true);
  });

  it('fails on a short password and keeps the reason for the door', async () => {
    await store.dispatch(signIn('alex@example.org', 'abc', fast));
    expect(session()).toMatchObject({ status: 'failed', failure: 'wrong-credentials' });
    expect(isAdmitted(session(), NOW)).toBe(false);

    // The next attempt clears the reason before it is decided.
    const pending = store.dispatch(signIn('alex@example.org', 'geheim', fast));
    expect(session().failure).toBeNull();
    await pending;
    expect(session().status).toBe('signed-in');
  });

  it('signs the 0 € tier in without opening the app', async () => {
    await store.dispatch(signIn('frei@example.org', 'geheim', fast));

    // Signed in, and that is the point: the fourth state of the door is not a
    // failed login but a member the app is not part of.
    expect(session().status).toBe('signed-in');
    expect(session().entitlement).toMatchObject({ tier: 'free', appAccess: false, source: null });
    expect(isAdmitted(session(), NOW)).toBe(false);
    expect(accessShortfall(session(), NOW)).toBe('tier');
  });

  it('opens the app for a trial and closes it when the trial ends', async () => {
    await store.dispatch(signIn('test@example.org', 'geheim', fast));
    const { entitlement } = session();

    expect(entitlement).toMatchObject({ tier: 'paid', appAccess: true, source: 'trial' });
    expect(entitlement!.validUntil).toBe('2026-10-02T12:00:00.000Z');
    expect(isAdmitted(session(), NOW)).toBe(true);

    const later = Date.parse(entitlement!.validUntil!) + 1;
    expect(isAdmitted(session(), later)).toBe(false);
    expect(accessShortfall(session(), later)).toBe('lapsed');
  });

  it('opens the app through a local bundle', async () => {
    await store.dispatch(signIn('lokal@example.org', 'geheim', fast));
    expect(session().entitlement).toMatchObject({
      appAccess: true,
      source: 'local-bundle',
      localAreas: ['gelsenkirchen'],
    });
    expect(isAdmitted(session(), NOW)).toBe(true);
  });

  it('signs out to exactly the initial state', async () => {
    await store.dispatch(signIn('alex@example.org', 'geheim', fast));
    store.dispatch(signOut());
    expect(session()).toEqual({
      status: 'signed-out',
      account: null,
      entitlement: null,
      failure: null,
      upgradeStarted: false,
    });
  });
});

describe('the re-check after an upgrade', () => {
  it('answers the same thing until the upgrade page was opened', async () => {
    await store.dispatch(signIn('frei@example.org', 'geheim', fast));
    await store.dispatch(refreshEntitlement(fast));
    expect(isAdmitted(session(), NOW)).toBe(false);

    store.dispatch(upgradeStarted());
    await store.dispatch(refreshEntitlement(fast));
    expect(session().entitlement).toMatchObject({ tier: 'paid', appAccess: true });
    expect(isAdmitted(session(), NOW)).toBe(true);
  });

  it('does nothing for nobody', async () => {
    await store.dispatch(refreshEntitlement(fast));
    expect(session().entitlement).toBeNull();
  });
});

describe('the entitlement, read on its own', () => {
  const paid: Entitlement = {
    tier: 'paid',
    appAccess: true,
    source: 'paid',
    validUntil: null,
    localAreas: [],
  };

  it('never reads an amount: the tier and the flag decide', () => {
    expect(hasAppAccess(paid, NOW)).toBe(true);
    expect(hasAppAccess({ ...paid, appAccess: false }, NOW)).toBe(false);
    expect(hasAppAccess(null, NOW)).toBe(false);
  });

  it('treats a past validUntil as lapsed and a future one as open', () => {
    expect(hasAppAccess({ ...paid, validUntil: '2026-09-01T00:00:00.000Z' }, NOW)).toBe(false);
    expect(hasAppAccess({ ...paid, validUntil: '2026-09-03T00:00:00.000Z' }, NOW)).toBe(true);
  });

  it('derives a greeting name from the address', () => {
    expect(nameFromEmail('alex.beispiel@example.org')).toBe('Alex Beispiel');
    expect(nameFromEmail('m-k@example.org')).toBe('M K');
    expect(nameFromEmail('@example.org')).toBe('Mitglied');
  });

  it('keeps the simulated directory in step with the rules the door prints', () => {
    expect(simulatedEntitlement('frei@x.de').appAccess).toBe(false);
    expect(simulatedEntitlement('test@x.de').source).toBe('trial');
    expect(simulatedEntitlement('lokal@x.de').source).toBe('local-bundle');
    expect(simulatedEntitlement('soli@x.de').tier).toBe('soli');
    expect(simulatedEntitlement('frei@x.de', { upgraded: true }).appAccess).toBe(true);
  });
});

describe('persistence', () => {
  const declared = () => persisted<SessionState>('session', PERSISTED_KEYS, sessionActions.hydrate);

  it('stores the account and the entitlement, and derives the status on restart', async () => {
    const platform = createMemoryPlatform();
    configurePlatform(platform);

    await persist(store, [declared()]);
    await store.dispatch(signIn('alex@example.org', 'geheim', fast));
    await new Promise((resolve) => setTimeout(resolve, 300));

    const raw = await platform.keyValue.getString('store.session');
    const written = JSON.parse(raw!) as Record<string, unknown>;
    // Nothing transient reaches storage: no status, no failure, no upgrade flag.
    expect(Object.keys(written).sort()).toEqual(['account', 'entitlement']);

    const restarted = createAppStore();
    await persist(restarted, [declared()]);
    expect(restarted.getState().session.status).toBe('signed-in');
    expect(isAdmitted(restarted.getState().session, NOW)).toBe(true);
  });

  it('hydrates an empty payload to signed out', () => {
    store.dispatch(sessionActions.hydrate({}));
    expect(session().status).toBe('signed-out');
  });
});
