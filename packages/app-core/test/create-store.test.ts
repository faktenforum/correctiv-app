import { describe, expect, it, vi } from 'vitest';

import { createStore } from '../src/stores/create-store';

/**
 * The core's own observable store, written because zustand resolves to its
 * CommonJS build under @nativescript/vite and broke the Android bundle (ADR 0004).
 * Hand-rolled state plumbing is exactly the kind of code that needs tests, so the
 * contract every binding depends on is pinned here.
 */

interface Counter {
  count: number;
  label: string;
  increment: () => void;
  setLabel: (label: string) => void;
}

const makeCounter = () =>
  createStore<Counter>((set, get) => ({
    count: 0,
    label: 'a',
    increment: () => set({ count: get().count + 1 }),
    setLabel: (label) => set({ label }),
  }));

describe('createStore', () => {
  it('exposes the initial state', () => {
    const store = makeCounter();
    expect(store.getState().count).toBe(0);
    expect(store.getState().label).toBe('a');
  });

  it('merges partial updates instead of replacing', () => {
    const store = makeCounter();
    store.setState({ count: 5 });
    expect(store.getState()).toMatchObject({ count: 5, label: 'a' });
    // Actions must survive a partial update, or the store becomes unusable.
    expect(typeof store.getState().increment).toBe('function');
  });

  it('replaces wholesale when asked', () => {
    const store = makeCounter();
    store.setState({ count: 9 } as Counter, true);
    expect(store.getState()).toEqual({ count: 9 });
  });

  it('accepts an updater function', () => {
    const store = makeCounter();
    store.setState((state) => ({ count: state.count + 10 }));
    expect(store.getState().count).toBe(10);
  });

  it('lets actions read through get()', () => {
    const store = makeCounter();
    store.getState().increment();
    store.getState().increment();
    expect(store.getState().count).toBe(2);
  });

  it('produces a new state object per update, so reference diffing works', () => {
    const store = makeCounter();
    const before = store.getState();
    store.setState({ count: 1 });
    // React bindings re-render on identity change; mutating in place would break them.
    expect(store.getState()).not.toBe(before);
    expect(before.count).toBe(0);
  });

  it('getInitialState keeps returning the first state', () => {
    const store = makeCounter();
    const first = store.getInitialState();
    store.setState({ count: 42 });
    expect(store.getInitialState()).toBe(first);
    expect(store.getInitialState().count).toBe(0);
  });
});

describe('subscribe', () => {
  it('notifies with the new and previous state', () => {
    const store = makeCounter();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 3 });

    expect(listener).toHaveBeenCalledTimes(1);
    const [next, previous] = listener.mock.calls[0];
    expect(next.count).toBe(3);
    expect(previous.count).toBe(0);
  });

  it('returns an unsubscribe function', () => {
    const store = makeCounter();
    const listener = vi.fn();
    const off = store.subscribe(listener);

    store.setState({ count: 1 });
    off();
    store.setState({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(2);
  });

  it('does not notify when the updater returns the same object', () => {
    const store = makeCounter();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState((state) => state);

    // Reference equality is how bindings decide to re-render, so a no-op update
    // must stay a no-op rather than triggering render churn everywhere.
    expect(listener).not.toHaveBeenCalled();
  });

  it('survives a listener unsubscribing during notification', () => {
    const store = makeCounter();
    const calls: string[] = [];
    const offA = store.subscribe(() => {
      calls.push('a');
      offA();
    });
    store.subscribe(() => calls.push('b'));

    // Mutating the listener set mid-iteration would otherwise skip 'b'.
    store.setState({ count: 1 });
    expect(calls).toEqual(['a', 'b']);

    store.setState({ count: 2 });
    expect(calls).toEqual(['a', 'b', 'b']);
  });

  it('survives a listener subscribing during notification', () => {
    const store = makeCounter();
    const calls: string[] = [];
    store.subscribe(() => {
      calls.push('a');
      store.subscribe(() => calls.push('late'));
    });

    store.setState({ count: 1 });
    // The newcomer must not be called for the update it was added during.
    expect(calls).toEqual(['a']);
  });

  it('notifies every listener in subscription order', () => {
    const store = makeCounter();
    const calls: string[] = [];
    store.subscribe(() => calls.push('first'));
    store.subscribe(() => calls.push('second'));

    store.setState({ count: 1 });
    expect(calls).toEqual(['first', 'second']);
  });
});
