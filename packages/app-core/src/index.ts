/**
 * `@correctiv/app-core` — the platform-free half of the app.
 *
 * The root entry deliberately exposes only the platform ports, because that is
 * the one thing every host must touch at startup:
 *
 *   import { configurePlatform } from '@correctiv/app-core';
 *
 * Everything else is imported by subpath, mirroring the source layout, so the
 * boundary stays legible at the call site and there are no barrel collisions
 * (e.g. `data/interests` vs `stores/interests`):
 *
 *   import { formatRelative } from '@correctiv/app-core/lib/format';
 *   import { useMembershipStore } from '@correctiv/app-core/stores/membership';
 *   import type { Article } from '@correctiv/app-core/types/models';
 */
export type { CorePlatform, FileStore, KeyValueStore } from './ports';
export { configurePlatform, createMemoryPlatform, platform, resetPlatform } from './ports';
