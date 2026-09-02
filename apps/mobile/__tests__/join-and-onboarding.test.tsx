import { act } from 'react-test-renderer';

import { diaries, earlyAccess } from '@correctiv/app-core/data/backstage';

/**
 * The two flows that change what the app is: onboarding decides whether it asks
 * again, and the join flow records the simulated contribution.
 *
 * Both are also where a dark pattern would be easiest to introduce, so the tests
 * assert the escape hatches too: skipping still counts as done, and every step
 * before the last offers an equal-weight "Erstmal umsehen".
 */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/openExternal', () => ({ openExternal: jest.fn() }));
jest.mock('@/lib/openArticle', () => ({ openArticle: jest.fn() }));

jest.mock('@expo/vector-icons', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Ionicons = ({ name }: { name: string }) => react.createElement(Text, null, `icon:${name}`);
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
});

import { router } from 'expo-router';

import { press, render, renderedText } from './support/rendering';

import BackstageScreen from '@/app/backstage';
import BeitretenScreen from '@/app/beitreten';
import OnboardingScreen from '@/app/onboarding';
import { resetStore } from '@correctiv/app-core/stores/store';

import { coreStore } from '@/lib/store/core';

const push = router.push as jest.Mock;
const replace = router.replace as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

describe('the contribution flow', () => {
  /**
   * It opened with a case for joining and then asked for a name and an email. Behind
   * the door it is reached from „Beitrag ändern“ by somebody who has already paid to
   * be here, so ADR 0019 dropped both steps: the case has no audience, and the app
   * already knows the two fields the form asked for.
   */
  it('opens on the amount, with no case to make and no form to fill', () => {
    const text = renderedText(render(<BeitretenScreen />));
    expect(text).toContain('Ihr Beitrag');
    expect(text).toContain('10 €');
    expect(text).not.toContain('CORRECTIV gehört niemandem');
    expect(text).not.toContain('Paywall');
    expect(text).not.toContain('Erstmal umsehen');
  });

  it('lets the amount and the interval be chosen', () => {
    const tree = render(<BeitretenScreen />);

    expect(renderedText(tree)).toContain('10 €');
    press(tree, '30 €');
    press(tree, 'Jährlich');

    const text = renderedText(tree);
    expect(text).toContain('30 €');
    expect(text).toContain('im Jahr');
    // The perk lines light up rather than gating anything.
    expect(text).toContain('✓ ');
  });

  it('records the contribution and confirms with the chosen amount', () => {
    const tree = render(<BeitretenScreen />);
    press(tree, '20 €');
    press(tree, 'Beitrag auf 20 € setzen');

    expect(coreStore.getState().membership).toMatchObject({
      amountEur: 20,
      interval: 'monatlich',
    });
    expect(coreStore.getState().membership.memberSince).not.toBeNull();
    const text = renderedText(tree);
    expect(text).toContain('Ihr Beitrag ist gesetzt.');
    expect(text).toContain('20 €');
    // Nobody is welcomed into something they are already inside.
    expect(text).not.toContain('Willkommen im Club');
  });
});

describe('onboarding', () => {
  it('opens on the mission screen with no skip', () => {
    const text = renderedText(render(<OnboardingScreen />));
    expect(text).toContain('Recherchen für die Gesellschaft');
    expect(text).not.toContain('Überspringen');
    // "Ohne Paywall: Journalismus für alle" stood here until ADR 0018.
    expect(text).not.toContain('Paywall');
  });

  it('records interests', () => {
    const tree = render(<OnboardingScreen />);
    press(tree, 'Los geht’s');

    press(tree, 'Klima');
    press(tree, 'Lokal');

    expect(coreStore.getState().interests.selected).toEqual(['klima', 'lokal']);
  });

  it('counts a skip as done, so it never asks twice', () => {
    const tree = render(<OnboardingScreen />);
    press(tree, 'Los geht’s');
    press(tree, 'Überspringen');

    expect(coreStore.getState().settings.onboardingDone).toBe(true);
    expect(replace).toHaveBeenCalledWith('/(tabs)');
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * The last step used to be the club pitch, with "Unterstützer:in werden" beside
   * "Erstmal umsehen". Behind the door (ADR 0016) both address someone who is not
   * here, so the step went with ADR 0018 and the walk ends one screen earlier.
   */
  it('ends after the participate step, with nothing left to buy', () => {
    const tree = render(<OnboardingScreen />);
    press(tree, 'Los geht’s');
    press(tree, 'Weiter');

    const text = renderedText(tree);
    expect(text).not.toContain('Unterstützer:in werden');
    expect(text).not.toContain('Erstmal umsehen');

    press(tree, 'Fertig');
    expect(coreStore.getState().settings.onboardingDone).toBe(true);
    expect(push).not.toHaveBeenCalledWith('/beitreten');
  });
});

describe('Backstage', () => {
  /**
   * Nothing here is locked, and that has not changed. What went with ADR 0018 is the
   * guest's copy: the teaser line and the "Mit dem Club jetzt lesen" button that
   * routed to the join flow instead of the article.
   */
  it('shows everything and opens the article directly', () => {
    const tree = render(<BackstageScreen />);
    const text = renderedText(tree);
    expect(text).toContain(earlyAccess.title);
    expect(text).toContain(diaries[0].title);
    expect(text).not.toContain('Mit dem Club jetzt lesen');
    expect(text).not.toContain('es ist eine Einladung');

    press(tree, 'Jetzt lesen');
    expect(push).not.toHaveBeenCalled(); // openArticle is mocked, not a route push
  });

  it('opens a diary entry', () => {
    press(render(<BackstageScreen />), diaries[0].title);
    expect(push).toHaveBeenCalledWith({
      pathname: '/tagebuch/[id]',
      params: { id: diaries[0].id },
    });
  });
});
