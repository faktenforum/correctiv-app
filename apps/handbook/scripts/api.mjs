/**
 * The core's API, extracted with TypeDoc and reduced to what the site renders.
 *
 * TypeDoc runs as a DATA EXTRACTOR here, never as a site generator: `--json`
 * only, no HTML, no theme. The handbook renders the model with its own
 * components, which is the whole reason this approach was chosen. A generated
 * documentation site would have arrived with its own navigation and its own
 * design, and the generated pages would have become the front door by accident.
 *
 * The raw model is tens of megabytes and mostly type-resolution bookkeeping, so
 * it is reduced here rather than shipped. What survives is what a reference panel
 * shows: a name, what kind of thing it is, its signature, its prose and the line
 * it lives on.
 *
 * `packages/app-core` has no barrel on purpose (ADR: subpath imports, the root
 * entry exposes only the ports), so there is no single entry point to hand
 * TypeDoc. `expand` over the source directory is the honest equivalent: every
 * module is a subpath a caller can import.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as td from 'typedoc';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CORE = join(ROOT, 'packages/app-core');
const OUT = join(HERE, '..', 'content', 'api.generated.json');

/** TypeDoc's numeric kinds, as the words the site prints. */
const KINDS = {
  [td.ReflectionKind.Function]: 'function',
  [td.ReflectionKind.Variable]: 'const',
  [td.ReflectionKind.TypeAlias]: 'type',
  [td.ReflectionKind.Interface]: 'interface',
  [td.ReflectionKind.Class]: 'class',
  [td.ReflectionKind.Enum]: 'enum',
};

/** The comment's prose, with TypeDoc's tag structure flattened back to text. */
function commentText(comment) {
  if (!comment) return '';
  const parts = comment.summary ?? [];
  return parts
    .map((part) => (part.kind === 'code' ? part.text : part.text))
    .join('')
    .trim();
}

/** The first sentence, for a list row. The rest is for the panel. */
function firstSentence(text) {
  const match = /^(.*?[.!?])(\s|$)/s.exec(text.replace(/\s+/g, ' '));
  return (match ? match[1] : text.replace(/\s+/g, ' ')).slice(0, 220);
}

function signatureOf(reflection) {
  const signatures = reflection.signatures ?? reflection.type?.declaration?.signatures;
  if (!signatures?.length) return reflection.type ? `: ${reflection.type.toString()}` : '';
  const s = signatures[0];
  const params = (s.parameters ?? [])
    .map(
      (p) =>
        `${p.flags?.isRest ? '...' : ''}${p.name}${p.flags?.isOptional ? '?' : ''}: ${p.type ?? 'unknown'}`,
    )
    .join(', ');
  return `(${params}): ${s.type ?? 'void'}`;
}

async function main() {
  const app = await td.Application.bootstrap(
    {
      entryPoints: [join(CORE, 'src')],
      entryPointStrategy: 'expand',
      tsconfig: join(CORE, 'tsconfig.json'),
      excludeInternal: true,
      excludePrivate: true,
      skipErrorChecking: true,
      logLevel: 'Warn',
    },
    [new td.TypeDocReader(), new td.TSConfigReader()],
  );

  const project = await app.convert();
  if (!project) throw new Error('TypeDoc converted nothing; the core did not parse');

  const modules = [];
  for (const module of project.children ?? []) {
    const file = module.sources?.[0]?.fileName;
    if (!file) continue;
    // `articles/load`, which is exactly what an importer writes after the
    // package name, so the page can print the import line verbatim.
    const subpath = relative(join(CORE, 'src'), join(ROOT, file)).replace(/\.tsx?$/, '');

    const symbols = [];
    for (const child of module.children ?? []) {
      const kind = KINDS[child.kind];
      if (!kind) continue;
      const doc = commentText(child.comment ?? child.signatures?.[0]?.comment);
      symbols.push({
        name: child.name,
        kind,
        signature: signatureOf(child),
        summary: firstSentence(doc),
        doc,
        line: child.sources?.[0]?.line ?? 0,
      });
    }
    if (symbols.length === 0) continue;

    modules.push({
      subpath,
      file: relative(ROOT, join(ROOT, file)),
      doc: commentText(module.comment),
      symbols: symbols.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  modules.sort((a, b) => a.subpath.localeCompare(b.subpath));

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ modules }, null, 2)}\n`);

  const symbols = modules.reduce((n, m) => n + m.symbols.length, 0);
  const documented = modules.reduce((n, m) => n + m.symbols.filter((s) => s.doc).length, 0);
  const size = Math.round(readFileSync(OUT).length / 1024);
  console.log(
    `api.generated.json: ${modules.length} modules, ${symbols} symbols, ${documented} with prose, ${size} KB`,
  );
}

await main();
