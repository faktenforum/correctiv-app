import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // The core must stay runnable without a device: no platform SDK, no DOM.
    // If a test needs either, the module under test belongs in a host, not here.
  },
});
