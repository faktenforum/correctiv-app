import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Only for the Vue store bindings. The rest of this app cannot be unit-tested
 * without a NativeScript runtime, and is covered by vue-tsc plus the Android
 * build in CI instead.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@correctiv/app-core': fileURLToPath(new URL('../../packages/app-core/src', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
