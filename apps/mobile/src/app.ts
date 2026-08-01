import { createApp, registerElement } from 'nativescript-vue';
import { createPinia } from 'pinia';
import { Application, Frame, Utils } from '@nativescript/core';
import type { AndroidActivityBackPressedEventData } from '@nativescript/core/application/application-interfaces';
import CollectionViewPlugin from '@nativescript-community/ui-collectionview/vue3';
import { AWebView } from '@nativescript-community/ui-webview';
import { Video as ExoVideoElement } from '@nstudio/nativescript-exoplayer';
import { configurePlatform } from '@correctiv/app-core';
import AppShell from './AppShell.vue';
import { nativeScriptPlatform } from './platform/nativescript';
import { useSettingsStore, PERSISTED_KEYS } from '@correctiv/app-core/stores/settings';
import { useSavedArticlesStore } from '@correctiv/app-core/stores/savedArticles';
import { useMembershipStore } from '@correctiv/app-core/stores/membership';
import { useInterestsStore } from '@correctiv/app-core/stores/interests';
import { useParticipationStore } from '@correctiv/app-core/stores/participation';
import { useFeedsStore } from './stores/feeds';
import { useAudioStore } from './stores/audio';
import { useVideoStore } from '@correctiv/app-core/stores/video';
import { persist } from '@correctiv/app-core/stores/persist';
import { registerExclusiveMedium } from '@correctiv/app-core/media/exclusive-playback';
// @nativescript/vite only applies a file named app.css automatically —
// therefore import the SCSS as a string and register it ourselves.
import appCss from './app.scss?inline';

// Hand the core its platform capabilities BEFORE any store or service is touched
// (persist() below reads through the KeyValueStore port).
configurePlatform(nativeScriptPlatform);

Application.addCss(appCss);

// Static import — require() does not yield a constructor under Vite/ESM
registerElement('AWebView', () => AWebView);
// Native video element (ExoPlayer on Android, AVPlayer on iOS) for PeerTube HLS.
registerElement('ExoVideo', () => ExoVideoElement);

const pinia = createPinia();
const app = createApp(AppShell);
app.use(pinia);
app.use(CollectionViewPlugin);

const settings = useSettingsStore(pinia);
persist(settings, PERSISTED_KEYS);
persist(useSavedArticlesStore(pinia), ['items']);
persist(useMembershipStore(pinia), ['isMember', 'name', 'memberSince', 'amountEur', 'interval', 'paused']);
persist(useInterestsStore(pinia), ['selected']);
persist(useParticipationStore(pinia), ['submissions']);

// Only one medium plays at a time. Registering the two players here (instead of
// letting the stores import each other) is what keeps the video store free of
// any NativeScript dependency.
registerExclusiveMedium('audio', () => useAudioStore(pinia).stop());
registerExclusiveMedium('video', () => useVideoStore(pinia).close());

if (__ANDROID__) {
  // The native image fetcher (org.nativescript.widgets) caches remote images in
  // <externalCacheDir>/http but never creates that directory — on fresh devices
  // every remote Image fails with ENOENT. Create it once at startup.
  Application.on(Application.launchEvent, () => {
    try {
      const extCache = Utils.android.getApplicationContext()?.getExternalCacheDir();
      if (extCache) new java.io.File(extCache, 'http').mkdirs();
    } catch (err) {
      console.error('Could not prepare the external image cache dir:', err);
    }
  });

  // With five parallel frames the hardware back button would otherwise pop
  // arbitrary frames: first go back within the active tab, then to the home tab, then default.
  Application.android.on('activityBackPressed', (args: AndroidActivityBackPressedEventData) => {
    const frame = Frame.getFrameById(`tab-${settings.activeTab}`);
    if (frame?.canGoBack()) {
      args.cancel = true;
      frame.goBack();
    } else if (settings.activeTab !== 'home') {
      args.cancel = true;
      settings.setActiveTab('home');
    }
  });
}


// Refresh live content when the app returns to the foreground — keeps the
// "fresh every day" promise without a pull-to-refresh plugin dependency.
Application.on(Application.resumeEvent, () => {
  const feeds = useFeedsStore(pinia);
  feeds.fetch('recherchen', { force: true });
  feeds.fetch('faktencheck', { force: true });
});

app.start();
