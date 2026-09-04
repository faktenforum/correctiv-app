/**
 * Is each of this host's prop workarounds still necessary?
 *
 * `shims/react-native.tsx` answers the props the GTK layer refuses, in 110 places, and
 * every one of those answers was correct when it was written. The failure mode is not
 * that one of them is wrong — it is that upstream ANSWERS the prop later, the shim goes
 * on handling it, and nothing says so. A redundant workaround is indistinguishable from
 * a necessary one by reading, and the app is meanwhile told it lost a capability it has.
 *
 * That has now happened twice in this tree. `flex-wrap` was stripped here until
 * `@gjsify/react-native` 0.46 mapped it to a wrapping widget; the branch was removed and
 * README.md kept the consequence for another two weeks. And `accessibilityLiveRegion`
 * is dropped here with a comment predicting that the layer would grow an answer on
 * `Text` — it has, and the header still reads as a loss.
 *
 * `@gjsify/react-native/prop-table` is what makes it checkable rather than re-readable.
 * `explainProp(primitive, prop)` returns `null` when the layer renders a prop and the
 * sentence a render would print when it does not, so every entry in
 * `shims/answered-props.ts` is a claim with an oracle behind it.
 *
 * WHAT THIS DOES NOT COVER, named because the gap is the expensive one: whether the app
 * PASSES a prop that nothing answers. That is a question about JSX across 26 screens and
 * about components like `<Typo>` that forward `...rest` onto a primitive — which is how
 * `<Typo onPress>` reached a `Gtk.Label` and took Home down with an uncaught
 * `PrimitiveError`. It needs a parser and one level of forwarding analysis;
 * `support-gate.test.ts` names it. This file answers the half that needs neither.
 */

import { describe, expect, it } from 'vitest';

import { explainProp, PRIMITIVE_NAMES } from '@gjsify/react-native/prop-table';

import { ANSWERED_PROPS, UPSTREAM_CAUGHT_UP } from '../src/shims/answered-props.js';

describe('the prop workarounds', () => {
  it('names a real primitive in every entry', () => {
    // A typo in a primitive name would make `explainProp` answer about nothing, and
    // every assertion below would pass for the wrong reason.
    const names = new Set(PRIMITIVE_NAMES);
    const unknown = [
      ...ANSWERED_PROPS.map((entry) => entry.primitive),
      ...UPSTREAM_CAUGHT_UP.map(([primitive]) => primitive),
    ].filter((primitive) => !names.has(primitive));
    expect(unknown).toEqual([]);
  });

  it('is still needed, every one of them', () => {
    // The forward direction: the layer must still refuse what this host answers. An
    // entry the layer now accepts belongs in UPSTREAM_CAUGHT_UP instead — and is a
    // workaround to remove, plus possibly a capability to wire back.
    const redundant = ANSWERED_PROPS.filter(
      (entry) => explainProp(entry.primitive, entry.prop) === null,
    ).map(
      (entry) => `<${entry.primitive}> ${entry.prop} — the layer accepts it now (${entry.why})`,
    );
    expect(redundant).toEqual([]);
  });

  it('carries a reason for every entry', () => {
    // The `why` is what a failure above prints, so it has to say what removing the
    // workaround would cost rather than restate the prop name.
    const thin = ANSWERED_PROPS.filter(
      (entry) => entry.why.length < 40 && !entry.why.startsWith('see '),
    ).map((entry) => `${entry.primitive}.${entry.prop}`);
    expect(thin).toEqual([]);
  });

  it('holds the caught-up ledger exact', () => {
    // Both directions, because both are silent. An entry the layer has gone back to
    // refusing means the shim's handling is load-bearing again and the ledger is
    // lying; a prop that became accepted and is not listed is the drift this file
    // exists to catch, and it would otherwise be found by reading a comment.
    const stillRefused = UPSTREAM_CAUGHT_UP.filter(
      ([primitive, prop]) => explainProp(primitive, prop) !== null,
    ).map(([primitive, prop]) => `<${primitive}> ${prop} — refused again, so the ledger is wrong`);
    expect(stillRefused).toEqual([]);
  });

  it('lists each prop once', () => {
    const keys = [
      ...ANSWERED_PROPS.map((entry) => `${entry.primitive}.${entry.prop}`),
      ...UPSTREAM_CAUGHT_UP.map(([primitive, prop]) => `${primitive}.${prop}`),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('refuses an invented prop, so the oracle is not answering yes to everything', () => {
    // The discriminator. Every assertion above is a comparison against `null`, and a
    // `explainProp` that returned a string for anything would make all of them pass.
    expect(explainProp('View', 'thisPropDoesNotExist')).not.toBeNull();
    expect(explainProp('View', 'className')).toBeNull();
  });
});
