import { join } from 'node:path';

import type { Plugin } from 'vite';

import { collectDocs, ROOT } from './collect.ts';

const MODULE_ID = 'virtual:docs';

/**
 * Serves the repository's own Markdown to the handbook, parsed, at build time.
 *
 * The handbook holds no copy of any document. That is the whole point of reading
 * them from here: a second copy of `ARCHITECTURE.md` would be the one on the
 * website, and it would be the one nobody edits. The cost is that editing a
 * document outside this package has to reload the page, which `handleHotUpdate`
 * below arranges.
 *
 * Markdown is parsed here and not in the browser, so `marked` is a build-time
 * dependency and the bundle ships rendered HTML strings with no parser in them.
 */
export function docsPlugin(): Plugin {
  let watched: string[] = [];

  return {
    name: 'handbook-docs',

    resolveId(id) {
      return id === MODULE_ID ? `\0${MODULE_ID}` : null;
    },

    load(id) {
      if (id !== `\0${MODULE_ID}`) return null;
      const { module, files } = collectDocs();
      watched = files;
      // Declared rather than inferred: these files are outside this package and
      // Vite has no other way to know the virtual module depends on them.
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(module)};`;
    },

    configureServer(server) {
      // The documents live above this package's root, and Vite's dev server
      // refuses to watch outside it unless told. Without this an edit to
      // ARCHITECTURE.md changes nothing until the server is restarted, which
      // looks like the plugin not working.
      server.watcher.add(watched.length > 0 ? watched : [join(ROOT, 'adr'), join(ROOT, '*.md')]);
    },

    handleHotUpdate({ file, server }) {
      if (!watched.includes(file)) return;
      // A document is one big string inside one virtual module, so there is
      // nothing finer to invalidate than the module, and nothing to hot-swap.
      const mod = server.moduleGraph.getModuleById(`\0${MODULE_ID}`);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.hot.send({ type: 'full-reload' });
      return [];
    },
  };
}
