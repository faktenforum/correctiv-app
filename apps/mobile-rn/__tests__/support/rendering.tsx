import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { coreStore } from '@/lib/store/core';

/**
 * Shared screen-rendering helpers.
 *
 * Not a `.test.tsx`, so jest's testMatch ignores it (`**\/__tests__/**\/*.test.*`).
 *
 * This started as a copy in every screen test, and the copies disagreed: joining
 * every string with a newline turns `Schritt {n} von {total}` — one Text with four
 * children — into four lines, so the obvious assertion fails on markup that is
 * perfectly correct. `renderedText` below joins within a Text and breaks only
 * between elements.
 */

/**
 * The screens use SafeAreaView, which needs metrics — there is no native view to
 * measure in a test. Deliberately NOT react-native-safe-area-context/jest/mock:
 * that mock reports zero insets, and several assertions here are about what a real
 * device's insets push out of view. Explicit metrics keep the numbers honest and
 * the same for every test.
 */
export const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 402, height: 760 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mounted: ReactTestRenderer[] = [];

/**
 * Every tree is unmounted after its test. Leaking them is not cosmetic: a mounted
 * screen stays subscribed to the store, so a reset in the next `beforeEach`
 * re-renders it and its effects run into the following test.
 */
afterEach(() => {
  act(() => {
    for (const tree of mounted) tree.unmount();
  });
  mounted.length = 0;
});

export function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <Provider store={coreStore}>
        <SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>
      </Provider>,
    );
  });
  mounted.push(tree);
  return tree;
}

/** Everything the tree renders as text; one line per element, no split words. */
export function renderedText(tree: ReactTestRenderer): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (node && typeof node === 'object' && 'children' in node) {
      const element = node as { type?: string; children: unknown };
      const isText = element.type === 'Text' || element.type === 'RCTText';
      if (!isText) parts.push('\n');
      walk(element.children);
      if (!isText) parts.push('\n');
    }
  };
  walk(tree.toJSON());
  return parts.join('');
}

/** Pressables carrying this accessibility label — several is normal (a list). */
export function findAllPressable(tree: ReactTestRenderer, label: string): ReactTestInstance[] {
  return tree.root.findAll(
    (node) => node.props?.accessibilityLabel === label && typeof node.props?.onPress === 'function',
  );
}

export function findPressable(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const [first] = findAllPressable(tree, label);
  if (!first) throw new Error(`No pressable labelled "${label}"`);
  return first;
}

/** Presses the first pressable with that label. */
export function press(tree: ReactTestRenderer, label: string): void {
  const node = findPressable(tree, label);
  act(() => {
    node.props.onPress();
  });
}

export function isDisabled(tree: ReactTestRenderer, label: string): boolean {
  return Boolean(findPressable(tree, label).props.accessibilityState?.disabled);
}

/** Types into the input with that accessibility label. */
export function typeInto(tree: ReactTestRenderer, label: string, value: string): void {
  const field = tree.root.find(
    (node) => node.props?.accessibilityLabel === label && !!node.props?.onChangeText,
  );
  act(() => {
    field.props.onChangeText(value);
  });
}
