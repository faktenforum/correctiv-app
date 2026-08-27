import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Provider } from 'react-redux';

/**
 * The root layout's two decisions that nothing else can see.
 *
 *  1. **The Provider has to hold the core's singleton.** Screens read through the
 *     Provider (`useAppSelector`), while `coreActions` and the two modules that run
 *     outside React dispatch straight into the imported store. Those are only the
 *     same store because this file hands the Provider that very instance — an
 *     invariant with no other enforcement, and one whose breach is silent: both
 *     halves keep working and the screens simply stop updating.
 *  2. **The jump into the onboarding fires once, and only from `/`.** Anywhere else
 *     it would overwrite every shared link on the web target, which is the whole
 *     reason the pathname is checked; and it is a `replace`, because the onboarding
 *     is not a place one returns to.
 *
 * Neither was testable while the gate was a module-level `let`: the first mount in
 * a suite consumed it for every mount after it, so any second assertion passed
 * because nothing happened rather than because the right thing did.
 */

/**
 * The CSS entry exists for Uniwind's Metro transform. Jest has no transform for
 * `.css`, so without this it parses the stylesheet as JavaScript.
 */
jest.mock('@/global.css', () => ({}));

jest.mock('expo-router', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    react.createElement(View, null, children);
  Stack.Screen = () => null;
  return {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    usePathname: jest.fn(() => '/'),
    Stack,
  };
});

// The fonts never resolve here, so the shell renders null — everything under test
// is decided above that early return.
jest.mock('expo-font', () => ({ useFonts: () => [false, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('uniwind', () => ({
  Uniwind: { setTheme: jest.fn() },
  useUniwind: () => ({ theme: 'light', hasAdaptiveThemes: true }),
}));

/**
 * The real adapter reaches for AsyncStorage's native module. The core's in-memory
 * platform answers the same ports, so `persist()` and the hydration gate below run
 * for real against it — only the storage is different.
 */
jest.mock('@/lib/platform/expo', () => {
  const core = jest.requireActual<typeof import('@correctiv/app-core')>('@correctiv/app-core');
  return {
    expoPlatform: core.createMemoryPlatform(),
    hydratePlatform: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('@/lib/audio/backend', () => ({
  expoAudio: { addStatusListener: jest.fn(() => jest.fn()) },
}));

import { router, usePathname } from 'expo-router';

import { completeOnboarding } from '@correctiv/app-core/stores/settings';
import { resetStore } from '@correctiv/app-core/stores/store';

import RootLayout from '@/app/_layout';
import { coreActions, coreStore } from '@/lib/store/core';

const replace = router.replace as jest.Mock;
const push = router.push as jest.Mock;
const pathname = jest.mocked(usePathname);

const mounted: ReactTestRenderer[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  pathname.mockReturnValue('/');
  act(() => {
    coreStore.dispatch(resetStore());
  });
});

afterEach(() => {
  act(() => {
    for (const tree of mounted) tree.unmount();
  });
  mounted.length = 0;
});

/**
 * Mounts the layout and lets the hydration promise settle, which is what flips
 * `storeReady` and therefore what the redirect waits for.
 */
async function mount(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<RootLayout />);
  });
  mounted.push(tree);
  return tree;
}

/** The store the Provider actually hands to the tree below it. */
const providerStore = (tree: ReactTestRenderer) =>
  tree.root.findByType(Provider).props.store as typeof coreStore;

describe('the Provider', () => {
  it('is handed the core singleton', async () => {
    expect(providerStore(await mount())).toBe(coreStore);
  });

  it('lets a write through coreActions reach what the screens read', async () => {
    // The invariant stated in terms of what it protects: `coreActions` is bound to
    // the imported store, the screens select from the Provider's. Against two
    // stores this assertion fails and nothing else would.
    const store = providerStore(await mount());
    expect(store.getState().settings.onboardingDone).toBe(false);

    act(() => {
      coreActions.settings.completeOnboarding();
    });

    expect(store.getState().settings.onboardingDone).toBe(true);
  });
});

describe('the onboarding gate', () => {
  it('jumps into the onboarding when the app starts on the home route', async () => {
    await mount();

    expect(replace).toHaveBeenCalledWith('/onboarding');
    // `replace`, not `push`: there is nothing to come back to.
    expect(push).not.toHaveBeenCalled();
  });

  it('jumps once, however often the effect re-runs', async () => {
    const tree = await mount();
    expect(replace).toHaveBeenCalledTimes(1);

    // The onboarding is now the route, so `pathname` changes and the effect's own
    // dependency list re-runs it. Without the gate this is a second jump — to the
    // screen the app is already on.
    pathname.mockReturnValue('/onboarding');
    await act(async () => {
      tree.update(<RootLayout />);
    });

    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('leaves a deep link alone', async () => {
    // The web target's shared addresses are real URLs: someone opening /backstage
    // has to land on Backstage. This is the case the pathname check exists for, and
    // it does not arise natively, where the app always starts at '/'.
    pathname.mockReturnValue('/backstage');

    await mount();

    expect(replace).not.toHaveBeenCalled();
  });

  it('does not ask again once the onboarding is done', async () => {
    act(() => {
      coreStore.dispatch(completeOnboarding());
    });

    await mount();

    expect(replace).not.toHaveBeenCalled();
  });

  it('decides per mount, not per module', async () => {
    // What the module-level flag broke. A remount is a fresh start of the app, so
    // it owes the same decision — and a gate that outlives the component would
    // make every assertion above depend on test order.
    await mount();
    expect(replace).toHaveBeenCalledTimes(1);

    act(() => {
      for (const tree of mounted) tree.unmount();
    });
    mounted.length = 0;

    await mount();
    expect(replace).toHaveBeenCalledTimes(2);
  });
});
