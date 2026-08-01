import { ApplicationSettings, File, Folder, knownFolders, path } from '@nativescript/core';
import type { CorePlatform, FileStore, KeyValueStore } from '@correctiv/app-core';

/**
 * NativeScript implementation of the `@correctiv/app-core` platform ports.
 * This file is the ONLY place where the core's storage needs meet the
 * NativeScript SDK — a web host implements the same two interfaces against
 * localStorage/IndexedDB instead.
 */

const keyValue: KeyValueStore = {
  getString(key) {
    const raw = ApplicationSettings.getString(key, '');
    return raw === '' ? null : raw;
  },
  setString(key, value) {
    ApplicationSettings.setString(key, value);
  },
  remove(key) {
    ApplicationSettings.remove(key);
  },
};

function cacheFolder(namespace: string): Folder {
  return knownFolders.documents().getFolder(`cache/${namespace}`);
}

const files: FileStore = {
  read(namespace, name) {
    try {
      const filePath = path.join(cacheFolder(namespace).path, name);
      if (!File.exists(filePath)) return null;
      return File.fromPath(filePath).readTextSync();
    } catch {
      return null;
    }
  },
  write(namespace, name, contents) {
    try {
      cacheFolder(namespace).getFile(name).writeTextSync(contents);
    } catch {
      // the blob cache is best-effort; never let it break a render
    }
  },
};

export const nativeScriptPlatform: CorePlatform = { keyValue, files };
