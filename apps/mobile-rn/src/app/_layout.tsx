import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configurePlatform } from '@correctiv/app-core';
import { persist } from '@correctiv/app-core/stores/persist';
import { PERSISTED_KEYS } from '@correctiv/app-core/stores/settings';

import { expoPlatform, hydratePlatform } from '@/lib/platform/expo';
import { coreStores } from '@/lib/store/core';
import { fontAssets } from '@/lib/theme';

// Hand the core its platform capabilities before anything reads a store.
configurePlatform(expoPlatform);

// Splash bleibt sichtbar, bis Merriweather + Source Sans 3 geladen sind
// (kein Font-Flash beim ersten Render).
SplashScreen.preventAutoHideAsync();

/**
 * Registered only AFTER the platform cache is hydrated. The KeyValueStore port is
 * synchronous and reads an in-memory mirror, so wiring persist() beforehand would
 * read empty state and then overwrite the real state on the first change — a data
 * loss bug that looks like "settings randomly reset". See lib/platform/expo.ts.
 */
function registerPersistence(): void {
  persist('settings', coreStores.settings, PERSISTED_KEYS);
  persist('savedArticles', coreStores.savedArticles, ['items']);
  persist('membership', coreStores.membership, [
    'isMember',
    'name',
    'memberSince',
    'amountEur',
    'interval',
    'paused',
  ]);
  persist('interests', coreStores.interests, ['selected']);
  persist('participation', coreStores.participation, ['submissions']);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    let active = true;
    const start = async () => {
      await hydratePlatform();
      if (!active) return;
      registerPersistence();
      setStoreReady(true);
    };
    // hydratePlatform swallows storage faults itself; this only stops an
    // unexpected throw from leaving the app stuck on a blank splash screen.
    start().catch((err: unknown) => {
      console.warn('[app] store hydration failed, starting anyway:', err);
      if (active) setStoreReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && storeReady) SplashScreen.hideAsync();
  }, [fontsLoaded, storeReady]);

  if (!fontsLoaded || !storeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
