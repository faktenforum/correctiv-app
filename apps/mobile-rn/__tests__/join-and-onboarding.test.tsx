import { act } from 'react-test-renderer';

import { diaries, earlyAccess } from '@correctiv/app-core/data/backstage';

/**
 * The two flows that change what the app is: onboarding decides whether it asks
 * again, and the join flow performs the status flip every club touchpoint reacts to.
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

import { isDisabled, press, render, renderedText, typeInto } from './support/rendering';

import BackstageScreen from '@/app/backstage';
import BeitretenScreen from '@/app/beitreten';
import OnboardingScreen from '@/app/onboarding';
import { resetStore } from '@correctiv/app-core/stores/store';

import { coreActions, coreStore } from '@/lib/store/core';

const push = router.push as jest.Mock;
const replace = router.replace as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

describe('the join flow', () => {
  it('argues with numbers before asking for anything', () => {
    const text = renderedText(render(<BeitretenScreen />));
    expect(text).toContain('CORRECTIV gehört niemandem');
    expect(text).toContain('31.000+');
    // No amount, no form — and an equal-weight way out.
    expect(text).toContain('Erstmal umsehen');
  });

  it('lets the amount and the interval be chosen', () => {
    const tree = render(<BeitretenScreen />);
    press(tree, 'Weiter');

    expect(renderedText(tree)).toContain('10 €');
    press(tree, '30 €');
    press(tree, 'Jährlich');

    const text = renderedText(tree);
    expect(text).toContain('30 €');
    expect(text).toContain('im Jahr');
    // The perk lines light up rather than gating anything.
    expect(text).toContain('✓ ');
  });

  it('will not submit half a form', () => {
    const tree = render(<BeitretenScreen />);
    press(tree, 'Weiter');
    press(tree, 'Mit 10 € unterstützen');

    expect(isDisabled(tree, 'Jetzt Mitglied werden')).toBe(true);
    typeInto(tree, 'Name', 'Testperson');
    expect(isDisabled(tree, 'Jetzt Mitglied werden')).toBe(true);
    typeInto(tree, 'E-Mail', 'test@beispiel.de');
    expect(isDisabled(tree, 'Jetzt Mitglied werden')).toBe(false);
  });

  it('flips the app-wide status and welcomes with the chosen amount', () => {
    const tree = render(<BeitretenScreen />);
    press(tree, 'Weiter');
    press(tree, '20 €');
    press(tree, 'Mit 20 € unterstützen');
    typeInto(tree, 'Name', 'Testperson');
    typeInto(tree, 'E-Mail', 'test@beispiel.de');
    press(tree, 'Jetzt Mitglied werden');

    // THE flip — every club touchpoint reads this in the same tick.
    expect(coreStore.getState().membership).toMatchObject({
      isMember: true,
      amountEur: 20,
      interval: 'monatlich',
      name: 'Testperson',
    });
    const text = renderedText(tree);
    expect(text).toContain('Willkommen im Club.');
    expect(text).toContain('20 €');
    // Past the flip there is nothing to escape from, so no "Erstmal umsehen".
    expect(text).not.toContain('Erstmal umsehen');
  });
});

describe('onboarding', () => {
  it('opens on the mission screen with no skip', () => {
    const text = renderedText(render(<OnboardingScreen />));
    expect(text).toContain('Recherchen für die Gesellschaft');
    expect(text).toContain('Ohne Paywall');
    expect(text).not.toContain('Überspringen');
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

  it('offers two equal paths at the end', () => {
    const tree = render(<OnboardingScreen />);
    press(tree, 'Los geht’s');
    press(tree, 'Weiter');
    press(tree, 'Weiter');

    const text = renderedText(tree);
    expect(text).toContain('Unterstützer:in werden');
    expect(text).toContain('Erstmal umsehen');

    press(tree, 'Unterstützer:in werden');
    expect(coreStore.getState().settings.onboardingDone).toBe(true);
    expect(push).toHaveBeenCalledWith('/beitreten');
  });
});

describe('Backstage', () => {
  it('shows everything to a guest, and invites instead of locking', () => {
    const text = renderedText(render(<BackstageScreen />));
    expect(text).toContain(earlyAccess.title);
    expect(text).toContain(diaries[0].title);
    // The concept's rule: closeness, not a paywall.
    expect(text).toContain('Mit dem Club jetzt lesen');
    expect(text).toContain('es ist eine Einladung');
  });

  it('sends a guest to the join flow from the early-access card', () => {
    press(render(<BackstageScreen />), 'Mit dem Club jetzt lesen');
    expect(push).toHaveBeenCalledWith('/beitreten');
  });

  it('opens the article for a member', () => {
    act(() => {
      coreActions.membership.join(10, 'monatlich', 'Testperson');
    });
    const tree = render(<BackstageScreen />);

    expect(renderedText(tree)).not.toContain('es ist eine Einladung');
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
