import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT } from '../plugin/collect.ts';
import {
  COUNTS,
  FEEDS,
  MEASURED_ON,
  NOT_CONTENT,
  QUESTIONS,
  SOURCES,
  UNUSED,
} from '../content/sources.manifest.ts';

const DATA_DIR = 'packages/app-core/src/data';

describe('the source manifest against the code', () => {
  /**
   * The assertion the manifest exists for.
   *
   * `SOURCES.md` is prose and cannot notice that somebody added a file. This can:
   * a new checked-in data set is sample data standing in for an API that does not
   * exist yet, it is indistinguishable from live content on screen, and the whole
   * point of the board is that it says so. A file added with no entry here would
   * otherwise appear on screen and nowhere in the inventory.
   */
  it('accounts for every file in the core’s data directory', () => {
    const onDisk = readdirSync(join(ROOT, DATA_DIR))
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .filter((name) => !NOT_CONTENT.includes(name));

    const declared = new Set(
      SOURCES.map((s) => s.module)
        .filter((m): m is string => Boolean(m))
        .filter((m) => m.startsWith(DATA_DIR))
        .map((m) => m.slice(DATA_DIR.length + 1)),
    );

    expect(onDisk.filter((name) => !declared.has(name))).toEqual([]);
  });

  it('names no module that has since moved', () => {
    // The other direction: an entry pointing at a file that no longer exists
    // would publish a dead link and a status nothing backs up.
    const missing = SOURCES.map((s) => s.module)
      .filter((m): m is string => Boolean(m))
      .filter((m) => !existsSync(join(ROOT, m)));
    expect(missing).toEqual([]);
  });

  it('gives every sample entry the thing it stands in for', () => {
    // A sample with no named replacement is indistinguishable from a decision to
    // ship invented content, and the difference is the whole of its status.
    const vague = SOURCES.filter((s) => s.status === 'sample' && !s.standsIn);
    expect(vague.map((s) => s.id)).toEqual([]);
  });

  it('gives every live entry an endpoint', () => {
    const vague = SOURCES.filter((s) => s.status === 'live' && !s.endpoint);
    expect(vague.map((s) => s.id)).toEqual([]);
  });
});

describe('the manifest against the document it was typed from', () => {
  /**
   * One fact, typed in two places, and nobody would notice them parting.
   *
   * `SOURCES.md` states the measuring day in its opening paragraph and the
   * manifest states it again as `MEASURED_ON`. Re-measuring means editing both,
   * and the failure is silent in the worst way: the board would print a date the
   * document it claims to be built from disagrees with, and the board is the
   * confident one because it is on a screen.
   */
  it('states the same measuring day as SOURCES.md', () => {
    const document = readFileSync(join(ROOT, 'SOURCES.md'), 'utf8');
    const stated = /measured against the live source on \*\*(\d{4}-\d{2}-\d{2})\*\*/.exec(document);

    // Thrown rather than expected, because the message is the useful part: the
    // sentence was rewritten and this pattern is what has to follow it.
    if (stated === null) {
      throw new Error(
        'SOURCES.md no longer states its measuring day in the shape this reads. Keep the sentence, or update the pattern here and say why.',
      );
    }
    expect(stated[1]).toBe(MEASURED_ON);
  });
});

describe('the manifest on its own terms', () => {
  it('points every question reference at a question that exists', () => {
    const bad = SOURCES.flatMap((s) => (s.questions ?? []).map((q) => ({ id: s.id, q }))).filter(
      ({ q }) => q < 1 || q > QUESTIONS.length,
    );
    expect(bad).toEqual([]);
  });

  it('uses every question at least once', () => {
    // A question nothing raises is either answered or was never a question about
    // the app, and either way the board should not still be asking it.
    const raised = new Set(SOURCES.flatMap((s) => s.questions ?? []));
    const orphans = QUESTIONS.map((_, i) => i + 1).filter((n) => !raised.has(n));
    expect(orphans).toEqual([]);
  });

  it('has unique ids', () => {
    const ids = SOURCES.map((s) => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('counts what it holds, rather than what somebody typed', () => {
    // The landing page prints these. It printed two hand-typed numbers once and
    // disagreed with this page by four.
    expect(COUNTS.live + COUNTS.sample + COUNTS.noSource).toBe(SOURCES.length);
    expect(COUNTS.questions).toBe(QUESTIONS.length);
  });

  it('never reports a source as using more than exists', () => {
    const impossible = UNUSED.filter((u) => u.used > u.available);
    expect(impossible.map((u) => u.label)).toEqual([]);
  });

  it('explains every feed that is not healthy', () => {
    // Stale and broken are the rows a reader will stop on, and a status with no
    // sentence behind it is an accusation rather than a finding.
    const unexplained = FEEDS.filter((f) => f.health !== 'healthy' && !f.note);
    expect(unexplained.map((f) => f.label)).toEqual([]);
  });
});
