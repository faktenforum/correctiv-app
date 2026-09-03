import { act } from 'react-test-renderer';

import { quarterlyReport } from '@correctiv/app-core/data/quartalsbericht';

/**
 * The profile used to render two versions of itself, one for a member and one for a
 * guest, and these tests pinned both. Since the door (ADR 0016) there is no guest to
 * render for, so the guest cases became assertions that its copy is gone (ADR 0018).
 * The membership sections are now unconditional, which is what the remaining cases
 * check. The contribution flow behind them went with ADR 0020: the app offers no
 * payment functions, so the card reads the entitlement and links out.
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/openExternal', () => ({ openExternal: jest.fn() }));

jest.mock('@expo/vector-icons', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Ionicons = ({ name }: { name: string }) => react.createElement(Text, null, `icon:${name}`);
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
});

import { router } from 'expo-router';
import { openExternal } from '@/lib/openExternal';

import { findAllPressable, press, render, renderedText } from './support/rendering';

import EinstellungenScreen from '@/app/einstellungen';
import GespeichertScreen from '@/app/gespeichert';
import ProfilScreen from '@/app/(tabs)/profil';
import { sessionActions } from '@correctiv/app-core/stores/session';
import { resetStore } from '@correctiv/app-core/stores/store';
import type { MembershipTier } from '@correctiv/app-core/types/models';

import { coreActions, coreStore } from '@/lib/store/core';

const push = router.push as jest.Mock;

const ARTICLE = {
  url: 'https://correctiv.org/x/2026/06/12/eine-recherche/',
  title: 'Eine Recherche',
  kicker: 'Recherche',
  rating: null,
  savedAt: '2026-06-12T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

/**
 * Through the door. The screen takes the reader's name and tier from the session,
 * so a test that does not sign in exercises the fallbacks instead of the real path.
 */
function signIn(tier: MembershipTier = 'paid'): void {
  act(() => {
    coreStore.dispatch(
      sessionActions.succeeded({
        account: { email: 'alex@example.org', name: 'Alex Beispiel' },
        entitlement: {
          tier,
          appAccess: true,
          source: 'paid',
          validUntil: null,
          localAreas: [],
          memberSince: '2026-03-04T09:12:00.000Z',
        },
      }),
    );
  });
}

describe('Profil before the session has answered', () => {
  it('has no guest copy left anywhere', () => {
    const text = renderedText(render(<ProfilScreen />));
    expect(text).not.toContain('Sie sind als Gast unterwegs');
    expect(text).not.toContain('Alles Wichtige bleibt frei zugänglich');
    expect(text).not.toContain('Unterstützer:in werden');
  });

  it('renders its sections with no entitlement to read yet', () => {
    const tree = render(<ProfilScreen />);
    const text = renderedText(tree);
    // The overline renders uppercase.
    expect(text).toContain('IHRE MITGLIEDSCHAFT');
    expect(text).toContain(quarterlyReport.quarter);
    expect(text).toContain('Ihr Backstage');
    // It is still marked as the club's. Asserted on the row's accessibility label
    // rather than on the badge text, because "Club" also occurs in the subtitle —
    // and this way a screen reader is covered too.
    expect(findAllPressable(tree, 'Ihr Backstage, Club')).toHaveLength(1);
  });
});

describe('Profil as a member', () => {
  it('takes the name from the session and the tier from the entitlement', () => {
    signIn();
    const text = renderedText(render(<ProfilScreen />));
    expect(text).toContain('CORRECTIV CLUB');
    expect(text).toContain('Alex Beispiel');
    expect(text).toContain('Mitgliedschaft mit Beitrag');
    expect(text).toContain('seit');
  });

  /** The card names what the membership system answered, not a fixed word. */
  it('names a Soli membership as such', () => {
    signIn('soli');
    expect(renderedText(render(<ProfilScreen />))).toContain('Soli-Mitgliedschaft');
  });

  /**
   * The card reads the answer and sets nothing. ADR 0020: the app offers no payment
   * functions, so an amount, an interval and a pause switch have no place here.
   */
  it('reads the entitlement and offers no way to set a contribution', () => {
    signIn();
    const text = renderedText(render(<ProfilScreen />));

    expect(text).toContain('Mitgliedschaft mit Beitrag');
    expect(text).toContain('Zugang über');
    expect(text).toContain('Ihren Beitrag');
    expect(text).toContain(quarterlyReport.quarter);

    expect(text).not.toContain('Beitrag festlegen');
    expect(text).not.toContain('Beitrag ändern');
    expect(text).not.toContain('Pausieren');
    expect(text).not.toContain('€ / Monat');
  });

  /** The one outbound link, and the label the store rules allow it to carry. */
  it('sends account management outside, and never names a price', () => {
    signIn();
    const tree = render(<ProfilScreen />);

    press(tree, 'Konto verwalten');

    expect(openExternal).toHaveBeenCalledWith('https://correctiv.org/unterstuetzen/');
    expect(push).not.toHaveBeenCalled();
  });

  /** A trial is the case where the app has an end date to print. */
  it('prints the end date of a trial', () => {
    act(() => {
      coreStore.dispatch(
        sessionActions.succeeded({
          account: { email: 'test@example.org', name: 'Test' },
          entitlement: {
            tier: 'paid',
            appAccess: true,
            source: 'trial',
            validUntil: '2026-10-02T00:00:00.000Z',
            localAreas: [],
            memberSince: '2026-03-04T09:12:00.000Z',
          },
        }),
      );
    });

    const text = renderedText(render(<ProfilScreen />));
    expect(text).toContain('Ihre Testphase');
    expect(text).toContain('Läuft bis');
    expect(text).toContain('2. Oktober');
  });

  it('opens the report, the saved list and the settings', () => {
    signIn();
    const tree = render(<ProfilScreen />);

    press(tree, `${quarterlyReport.quarter}, Club`);
    press(tree, 'Gespeicherte Artikel');
    press(tree, 'App-Einstellungen');

    expect(push.mock.calls.map((c) => c[0])).toEqual([
      '/bericht',
      '/gespeichert',
      '/einstellungen',
    ]);
  });
});

describe('newsletters and saved articles', () => {
  it('subscribes a newsletter through the store', () => {
    const tree = render(<ProfilScreen />);
    const row = tree.root.find(
      (n) => n.props?.accessibilityLabel === 'Spotlight' && !!n.props?.onValueChange,
    );
    act(() => {
      row.props.onValueChange(true);
    });

    // Persisted (PERSISTED_KEYS covers `newsletter`), so it survives a restart.
    expect(coreStore.getState().settings.newsletter.spotlight).toBe(true);
  });

  it('counts saved articles in singular and plural', () => {
    expect(renderedText(render(<ProfilScreen />))).toContain('Noch nichts gespeichert');

    act(() => {
      coreActions.savedArticles.toggle(ARTICLE);
    });
    expect(renderedText(render(<ProfilScreen />))).toContain('1 Artikel');

    act(() => {
      coreActions.savedArticles.toggle({ ...ARTICLE, url: `${ARTICLE.url}2` });
    });
    expect(renderedText(render(<ProfilScreen />))).toContain('2 Artikel');
  });

  it('removes an article from the saved list', () => {
    act(() => {
      coreActions.savedArticles.toggle(ARTICLE);
    });
    const tree = render(<GespeichertScreen />);
    expect(renderedText(tree)).toContain(ARTICLE.title);

    press(tree, `${ARTICLE.title} entfernen`);

    expect(coreStore.getState().savedArticles.items).toEqual([]);
  });
});

describe('settings', () => {
  it('switches theme between system, light and dark', () => {
    const tree = render(<EinstellungenScreen />);
    const toggle = (label: string, value: boolean) => {
      const row = tree.root.find(
        (n) => n.props?.accessibilityLabel === label && !!n.props?.onValueChange,
      );
      act(() => {
        row.props.onValueChange(value);
      });
    };

    toggle('An Systemeinstellung orientieren', false);
    expect(coreStore.getState().settings.theme).toBe('light');
    // The dark switch only exists once the system option is off.
    toggle('Dunkelmodus', true);
    expect(coreStore.getState().settings.theme).toBe('dark');
  });

  it('sets the reader text scale', () => {
    press(render(<EinstellungenScreen />), 'Textgröße A++');
    expect(coreStore.getState().settings.textScale).toBe(1.15);
  });

  it('resets the demo state across the stores that hold it', () => {
    act(() => {
      coreActions.interests.toggle('klima');
      coreActions.settings.completeOnboarding();
      coreActions.settings.setPushOptIn(true);
    });

    const tree = render(<EinstellungenScreen />);
    press(tree, 'Demo-Zustand zurücksetzen');

    expect(coreStore.getState().interests.selected).toEqual([]);
    expect(coreStore.getState().settings).toMatchObject({
      onboardingDone: false,
      pushOptIn: false,
      textScale: 1,
    });
    expect(renderedText(tree)).toContain('✓ Zurückgesetzt');
  });
});
