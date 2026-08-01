import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.correctiv.app.prototype',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  bundler: 'vite',
  bundlerConfigPath: 'vite.config.ts',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
  },
} as NativeScriptConfig;
