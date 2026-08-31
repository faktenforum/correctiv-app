// This host's half of `@correctiv/app-core`'s platform ports, assembled.
//
// `ARCHITECTURE.md` puts the whole cost of adding a host at one file implementing
// four interfaces, and ADR 0007 says that estimate stopped being theoretical when the
// NativeScript host was removed. This is the third host, and the estimate held: the
// files under this directory plus `../audio/backend.ts` are the entire platform
// surface, and none of the core moved to make room for them.
//
// Split the same way the Expo host splits it: storage and bundled content here, the
// audio backend added at the boot site, so that reasoning about where state is stored
// does not drag in a media framework and these three stay testable without one.

import type { CorePlatform } from '@correctiv/app-core';

import { content } from './content.js';
import { blobs, keyValue } from './storage.js';

export const gtkPlatform: CorePlatform = { keyValue, blobs, content };
