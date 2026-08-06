import { act } from 'react-test-renderer';

import { quarterlyReport } from '@correctiv/app-core/data/quartalsbericht';

/**
 * `isMember` is the demo's central lever — practically every section of the profile
 * reads it, and the app-wide flip when someone joins is the moment the demo is
 * built around. These tests pin both states and the transitions in between.
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

import { findAllPressable, press, render, renderedText } from './support/rendering';

import EinstellungenScreen from '@/app/einstellungen';
import GespeichertScreen from '@/app/gespeichert';
import ProfilScreen from '@/app/(tabs)/profil';
import { coreStores } from '@/lib/store/core';

const push = router.push as jest.Mock;

const initial = {
  membership: coreStores.membership.getState(),
  settings: coreStores.settings.getState(),
  saved: coreStores.savedArticles.getState(),
  interests: coreStores.interests.getState(),
};

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
    coreStores.membership.setState(initial.membership, true);
    coreStores.settings.setState(initial.settings, true);
    coreStores.savedArticles.setState(initial.saved, true);
    coreStores.interests.setState(initial.interests, true);
  });
});

function join(): void {
  act(() => {
    coreStores.membership.getState().join(25, 'jährlich', 'Testperson');
  });
}

describe('Profil as a guest', () => {
  it('invites instead of locking', () => {
    const text = renderedText(render(<ProfilScreen />));
    expect(text).toContain('Sie sind als Gast unterwegs');
    expect(text).toContain('Alles Wichtige bleibt frei zugänglich');
    expect(text).toContain('Unterstützer:in werden');
  });

  it('hides the member-only sections but keeps Backstage visible', () => {
    const tree = render(<ProfilScreen />);
    const text = renderedText(tree);
    expect(text).not.toContain('Ihr Beitrag');
    expect(text).not.toContain(quarterlyReport.quarter);
    // Backstage is teased openly to guests — that is the concept, not an oversight.
    expect(text).toContain('Backstage ansehen');
    // …and it is marked as the club's, so the tease reads as an invitation. Asserted
    // on the row's accessibility label rather than on the badge text, because
    // "Club" also occurs in the subtitle — and this way a screen reader is covered too.
    expect(findAllPressable(tree, 'Backstage ansehen, Club')).toHaveLength(1);
  });
});

describe('Profil as a member', () => {
  it('shows the club card with name and join date', () => {
    join();
    const text = renderedText(render(<ProfilScreen />));
    expect(text).toContain('CORRECTIV CLUB');
    expect(text).toContain('Testperson');
    expect(text).toContain('Mitglied seit');
  });

  it('shows the contribution and the quarterly report', () => {
    join();
    const text = renderedText(render(<ProfilScreen />));
    expect(text).toContain('25 € / Jahr');
    expect(text).toContain(quarterlyReport.quarter);
    expect(text).toContain('Ihr Backstage');
  });

  it('pauses without cancelling', () => {
    join();
    const tree = render(<ProfilScreen />);

    press(tree, 'Pausieren');

    const state = coreStores.membership.getState();
    expect(state.paused).toBe(true);
    expect(state.isMember).toBe(true); // Backstage stays open
    const text = renderedText(tree);
    expect(text).toContain('ist pausiert');
    expect(text).toContain('Fortsetzen');
  });

  it('opens the report, the saved list and the settings', () => {
    join();
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
    expect(coreStores.settings.getState().newsletter.spotlight).toBe(true);
  });

  it('counts saved articles in singular and plural', () => {
    expect(renderedText(render(<ProfilScreen />))).toContain('Noch nichts gespeichert');

    act(() => {
      coreStores.savedArticles.getState().toggle(ARTICLE);
    });
    expect(renderedText(render(<ProfilScreen />))).toContain('1 Artikel');

    act(() => {
      coreStores.savedArticles.getState().toggle({ ...ARTICLE, url: `${ARTICLE.url}2` });
    });
    expect(renderedText(render(<ProfilScreen />))).toContain('2 Artikel');
  });

  it('removes an article from the saved list', () => {
    act(() => {
      coreStores.savedArticles.getState().toggle(ARTICLE);
    });
    const tree = render(<GespeichertScreen />);
    expect(renderedText(tree)).toContain(ARTICLE.title);

    press(tree, `${ARTICLE.title} entfernen`);

    expect(coreStores.savedArticles.getState().items).toEqual([]);
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
    expect(coreStores.settings.getState().theme).toBe('light');
    // The dark switch only exists once the system option is off.
    toggle('Dunkelmodus', true);
    expect(coreStores.settings.getState().theme).toBe('dark');
  });

  it('sets the reader text scale', () => {
    press(render(<EinstellungenScreen />), 'Textgröße A++');
    expect(coreStores.settings.getState().textScale).toBe(1.15);
  });

  it('resets the demo state across all three stores', () => {
    join();
    act(() => {
      coreStores.interests.getState().toggle('klima');
      coreStores.settings.getState().completeOnboarding();
      coreStores.settings.getState().setPushOptIn(true);
    });

    const tree = render(<EinstellungenScreen />);
    press(tree, 'Demo-Zustand zurücksetzen');

    expect(coreStores.membership.getState().isMember).toBe(false);
    expect(coreStores.interests.getState().selected).toEqual([]);
    expect(coreStores.settings.getState()).toMatchObject({
      onboardingDone: false,
      pushOptIn: false,
      textScale: 1,
    });
    expect(renderedText(tree)).toContain('✓ Zurückgesetzt');
  });
});
