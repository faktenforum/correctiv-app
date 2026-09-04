import { act } from 'react-test-renderer';

/**
 * The door, in its four states.
 *
 * What these pin: the form will not submit half of itself, the waiting state
 * replaces the button rather than sitting beside it, a failure keeps the form and
 * names the reason, and the fourth state is written for a member, not for an
 * intruder: it thanks, it shows the entitlement, it offers the way in and a way
 * back to the form. And on every state the screen says it is simulated.
 */

// Reached through the design system's barrel (ScreenHeader → goBack), like every
// screen test; the door itself never navigates, the root layout swaps it out.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

import { sessionActions } from '@correctiv/app-core/stores/session';
import { resetStore } from '@correctiv/app-core/stores/store';
import type { Entitlement } from '@correctiv/app-core/types/models';

import { LoginGate } from '@/components/gate/LoginGate';
import { openExternal } from '@/lib/openExternal';
import { coreStore } from '@/lib/store/core';

import {
  findAllPressable,
  isDisabled,
  press,
  render,
  renderedText,
  typeInto,
} from './support/rendering';

const account = { email: 'alex@example.org', name: 'Alex' };
const free: Entitlement = {
  tier: 'free',
  appAccess: false,
  source: null,
  validUntil: null,
  localAreas: [],
  memberSince: '2026-03-04T09:12:00.000Z',
};

const session = () => coreStore.getState().session;

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

describe('signed out', () => {
  it('opens on the form, says whose place this is, and says it is simulated', () => {
    const text = renderedText(render(<LoginGate />));
    expect(text).toContain('Für alle, die CORRECTIV tragen.');
    expect(text).toContain('Mitglieder mit Beitrag');
    expect(text).toContain('SIMULIERT');
    expect(text).toContain('Es wird nichts übertragen.');
  });

  it('will not submit half a form', () => {
    const tree = render(<LoginGate />);
    expect(isDisabled(tree, 'Anmelden')).toBe(true);
    typeInto(tree, 'E-Mail-Adresse', 'alex@example.org');
    expect(isDisabled(tree, 'Anmelden')).toBe(true);
    typeInto(tree, 'Passwort eingeben', 'geheim');
    expect(isDisabled(tree, 'Anmelden')).toBe(false);
  });

  it('signs in through the core, and the door shows the round trip', async () => {
    jest.useFakeTimers();
    try {
      const tree = render(<LoginGate />);
      typeInto(tree, 'E-Mail-Adresse', 'alex@example.org');
      typeInto(tree, 'Passwort eingeben', 'geheim');
      press(tree, 'Anmelden');

      // Waiting: the button is gone, the reason for the wait is on screen.
      expect(session().status).toBe('signing-in');
      const waiting = renderedText(tree);
      expect(waiting).toContain('Wir prüfen Ihre Mitgliedschaft');
      expect(findAllPressable(tree, 'Anmelden')).toHaveLength(0);

      await act(async () => {
        jest.runAllTimers();
      });
      expect(session().status).toBe('signed-in');
      expect(session().account?.email).toBe('alex@example.org');
    } finally {
      jest.useRealTimers();
    }
  });

  it('sends "Mitglied mit Beitrag werden" outside, where membership is managed', () => {
    press(render(<LoginGate />), 'Mitglied mit Beitrag werden');
    expect(openExternal).toHaveBeenCalledWith(expect.stringContaining('correctiv.org'));
  });
});

describe('failed', () => {
  it('keeps the form and names the reason', () => {
    act(() => {
      coreStore.dispatch(sessionActions.failed('wrong-credentials'));
    });
    const tree = render(<LoginGate />);
    const text = renderedText(tree);
    expect(text).toContain('E-Mail-Adresse oder Passwort stimmen nicht');
    // Still a form: the next attempt starts here, not on a new screen.
    expect(findAllPressable(tree, 'Anmelden')).toHaveLength(1);
  });

  it('knows what to say when correctiv.org does not answer', () => {
    act(() => {
      coreStore.dispatch(sessionActions.failed('unreachable'));
    });
    expect(renderedText(render(<LoginGate />))).toContain('nicht erreichbar');
  });
});

describe('signed in without the app', () => {
  beforeEach(() => {
    act(() => {
      coreStore.dispatch(sessionActions.succeeded({ account, entitlement: free }));
    });
  });

  it('thanks a member instead of refusing an intruder', () => {
    const text = renderedText(render(<LoginGate />));
    expect(text).toContain('Angemeldet als alex@example.org');
    expect(text).toContain('Schön, dass Sie dabei sind.');
    expect(text).toContain('Kostenlose Mitgliedschaft');
    expect(text).toContain('Nicht enthalten');
    // No form, no error vocabulary.
    expect(text).not.toContain('Passwort');
    expect(text).not.toContain('Fehler');
  });

  it('opens the upgrade outside and lets the re-check find it', async () => {
    const tree = render(<LoginGate />);
    press(tree, 'Mitgliedschaft erweitern');
    expect(openExternal).toHaveBeenCalledWith(expect.stringContaining('correctiv.org'));
    expect(session().upgradeStarted).toBe(true);

    await act(async () => {
      press(tree, 'Erneut prüfen');
    });
    expect(session().entitlement?.appAccess).toBe(true);
  });

  it('offers the form again for another account', () => {
    const tree = render(<LoginGate />);
    press(tree, 'Mit einem anderen Konto anmelden');
    expect(session().status).toBe('signed-out');
    expect(renderedText(tree)).toContain('Für alle, die CORRECTIV tragen.');
  });

  it('names the end of a trial, dated', () => {
    act(() => {
      coreStore.dispatch(
        sessionActions.succeeded({
          account,
          entitlement: {
            tier: 'paid',
            appAccess: true,
            source: 'trial',
            validUntil: '2026-08-15T10:00:00.000Z',
            localAreas: [],
            memberSince: '2026-03-04T09:12:00.000Z',
          },
        }),
      );
    });
    const text = renderedText(render(<LoginGate />));
    expect(text).toContain('Testphase');
    expect(text).toContain('15. August 2026');
    expect(text).toContain('Beitrag festlegen');
  });
});
