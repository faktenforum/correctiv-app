import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT } from '../../plugin/collect.ts';

import { CONTENT_FEEDS } from '@correctiv/app-core/data/feeds.config';
import { fileKey } from '@correctiv/app-core/services/cache.service';
import { PERSISTED_KEYS as SESSION_KEYS } from '@correctiv/app-core/stores/session';
import { PERSISTED_KEYS as SETTINGS_KEYS } from '@correctiv/app-core/stores/settings';

import { applyFixture, FIXTURES } from '../../src/workbench/frame/seed';

/**
 * The shell writes the app's storage directly, so it has to know four things the
 * app owns: the two key prefixes, how a slice's key is spelled, how a cache blob
 * is named, and which feeds carry content. `seed.ts` re-implements all four,
 * deliberately — it must not import the React Native project, and it wants no
 * runtime dependency on the core either.
 *
 * The failure that costs is silent in exactly the way ADR 0014 warns about for
 * cross-origin. Change a prefix or the hash and every fixture still "succeeds":
 * `applyFixture` writes keys nothing reads, the app boots from its defaults, the
 * frame sits at the door, and `preview.html#/?s=signed-in` — the address README
 * hands out — looks like a broken app rather than a stale fixture.
 *
 * So this file holds the copies against the originals. The core is a test-only
 * dependency of the shell for this reason and no other; nothing under `src/`
 * imports it, and the Vite bundle is unchanged. The two facts that live in the
 * app rather than the core are read as source text, the way
 * `apps/mobile/__tests__/web-target.test.ts` does, because the shell may not
 * import from `apps/mobile` at all.
 */
// Resolved rather than counted: this file moved one directory deeper when the
// shell became part of the handbook, and a hard-coded depth is exactly what
// breaks silently when that happens.
const REPO = ROOT;

function source(path: string): string {
  return readFileSync(resolve(REPO, path), 'utf8');
}

/** `Object.keys()` over it must list the stored keys, as it does over the real one. */
class FakeStorage {
  getItem(key: string): string | null {
    return Object.hasOwn(this, key) ? (this as unknown as Record<string, string>)[key] : null;
  }
  setItem(key: string, value: string): void {
    (this as unknown as Record<string, string>)[key] = String(value);
  }
  removeItem(key: string): void {
    delete (this as unknown as Record<string, string>)[key];
  }
  clear(): void {
    for (const key of Object.keys(this)) this.removeItem(key);
  }
  key(index: number): string | null {
    return Object.keys(this)[index] ?? null;
  }
  get length(): number {
    return Object.keys(this).length;
  }
}

function seeded(id: string): { store: Storage; keys: string[] } {
  const store = new FakeStorage() as unknown as Storage;
  applyFixture(store, id);
  return { store, keys: Object.keys(store) };
}

function payload(store: Storage, slice: string): Record<string, unknown> {
  const raw = store.getItem(`kv:store.${slice}`);
  if (raw === null) throw new Error(`no payload for ${slice}`);
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('the storage layout the shell copies', () => {
  it('uses the prefixes the app reads', () => {
    // `lib/platform/expo.ts` is the only place these two are declared.
    const adapter = source('apps/mobile/src/lib/platform/expo.ts');
    expect(adapter).toContain("const KV_PREFIX = 'kv:'");
    expect(adapter).toContain("const BLOB_PREFIX = 'blob:'");

    for (const fixture of FIXTURES) {
      for (const key of seeded(fixture.id).keys) {
        expect(key).toMatch(/^(kv:|blob:)/);
      }
    }
  });

  it('spells a slice key the way persist() does', () => {
    expect(source('packages/app-core/src/stores/persist.ts')).toContain(
      'const storageKey = `store.${slice.id}`',
    );
    expect(seeded('onboarded').keys.filter((k) => k.startsWith('kv:'))).toEqual([
      'kv:store.session',
      'kv:store.settings',
    ]);
  });

  it('names a cache blob the way the cache service does', () => {
    // The hash is djb2, re-implemented in seed.ts. If the two ever disagree the
    // bundle fixture writes six blobs the feed cascade will never look for.
    const blobs = seeded('bundle').keys.filter((k) => k.startsWith('blob:'));

    expect(blobs).toEqual(CONTENT_FEEDS.map((key) => `blob:feeds/${fileKey(key)}.json`));
  });

  it('carries exactly the keys each slice declares as persisted', () => {
    // `persist()` restores only declared keys and writes back only declared keys,
    // so an invented one is dropped on the app's first write and a missing one
    // leaves that field at its default — neither says anything on the way past.
    const { store } = seeded('onboarded');

    expect(Object.keys(payload(store, 'session')).sort()).toEqual([...SESSION_KEYS].sort());
    expect(Object.keys(payload(store, 'settings')).sort()).toEqual([...SETTINGS_KEYS].sort());
  });

  it('wipes every key any fixture can write before writing the next', () => {
    // `clearApp` matches on the same two prefixes. A fixture that wrote outside
    // them would survive the wipe and leak into the next one silently.
    const store = new FakeStorage() as unknown as Storage;
    for (const fixture of FIXTURES) fixture.write(store);
    const everything = Object.keys(store);
    expect(everything.length).toBeGreaterThan(0);

    applyFixture(store, 'fresh');

    expect(Object.keys(store)).toEqual([]);
  });
});
