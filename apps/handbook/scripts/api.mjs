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

import { Marked } from 'marked';
import * as td from 'typedoc';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CORE = join(ROOT, 'packages/app-core');
const OUT = join(HERE, '..', 'content', 'api.generated.json');

/**
 * The comments are Markdown and are written as Markdown.
 *
 * They lean on backticks for every identifier and on bold for the sentence that
 * matters, so shipping them as plain text puts asterisks and backticks on screen
 * and reads as broken. Rendered here rather than in the browser, so the reference
 * ships HTML and no parser.
 */
const md = new Marked({ gfm: true });

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
  return (
    parts
      // Every part carries its text; the kinds differ in what they mean, not in
      // where the words are. This was a ternary with the same branch twice.
      .map((part) => part.text)
      .join('')
      .trim()
  );
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

/**
 * The file-header comment, which is where this core keeps its best prose.
 *
 * TypeDoc reports no module comment for any file here, and it is right to: a
 * module comment has to be the first thing in the file, and the convention in
 * `packages/app-core` is a block after the imports and above the first
 * declaration. In `articles/load.ts` that block explains the whole five-rung
 * cascade and sits above a private constant, so TypeDoc drops it on the floor
 * along with the constant. Losing it would leave the reference showing
 * signatures for the modules whose reasoning is the most worth reading.
 *
 * So the first block comment after the imports is read out of the source
 * directly, unless TypeDoc already attached that text to an exported symbol, in
 * which case it belongs to the symbol and not to the file.
 */
function fileHeader(path, symbols) {
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    return '';
  }

  const match = /\/\*\*([\s\S]*?)\*\//.exec(source);
  if (!match) return '';

  const text = match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, ''))
    .join('\n')
    .trim();

  if (!text) return '';
  if (symbols.some((s) => s.raw && s.raw.startsWith(text.slice(0, 60)))) return '';
  return text;
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
        raw: doc,
        doc: doc ? md.parse(doc) : '',
        line: child.sources?.[0]?.line ?? 0,
      });
    }
    if (symbols.length === 0) continue;

    const sorted = symbols.sort((a, b) => a.name.localeCompare(b.name));
    const moduleDoc = commentText(module.comment) || fileHeader(join(ROOT, file), symbols);
    // `raw` exists only for the comparison above; the page renders the HTML.
    for (const symbol of sorted) delete symbol.raw;
    modules.push({
      subpath,
      // `file` is already relative to ROOT; round-tripping it through join and
      // relative returned the input.
      file,
      doc: moduleDoc ? md.parse(moduleDoc) : '',
      symbols: sorted,
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
