import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Numeric size and spacing utilities are banned in this app.
 *
 * `tailwind.config.js` replaces Tailwind's spacing scale with the design system's,
 * and that one steps 2px per unit and stops at 48. So every numeric utility means
 * something other than what it says: `w-10` is 20px, not 40; `w-32` is 64px, not
 * 128; `w-64` does not exist at all and NativeWind drops it silently, after which
 * the element sizes to its content — that is how one rail card grew into a
 * full-screen black rectangle while build, typecheck and tests all stayed green.
 *
 * Named spacing tokens (`p-s`, `gap-m`, `mt-2xs`) say what they mean, and pixel
 * sizes belong in `src/lib/theme/sizes.ts` where the number is visible. `-0` stays
 * allowed: `inset-0` and `left-0` are zero in every scale.
 */
const SRC = join(__dirname, '..', 'src');
const FORBIDDEN =
  /\b(?:w|h|size|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-[1-9][0-9]*\b/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** Comments explain the trap, so they are allowed to name it. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

test('no numeric Tailwind size or spacing utilities in src/', () => {
  const offenders = sourceFiles(SRC).flatMap((file) => {
    const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
    return lines.flatMap((line, i) => {
      const hits = line.match(FORBIDDEN) ?? [];
      return hits.map((hit) => `${file.slice(SRC.length + 1)}:${i + 1} → ${hit}`);
    });
  });

  expect(offenders).toEqual([]);
});
