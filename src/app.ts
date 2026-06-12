import { createApp, registerElement } from 'nativescript-vue';
import { createPinia } from 'pinia';
import { Application, Frame } from '@nativescript/core';
import type { AndroidActivityBackPressedEventData } from '@nativescript/core/application/application-interfaces';
import CollectionViewPlugin from '@nativescript-community/ui-collectionview/vue3';
import { AWebView } from '@nativescript-community/ui-webview';
import AppShell from './AppShell.vue';
import { useSettingsStore, PERSISTED_KEYS } from './stores/settings';
import { useSavedArticlesStore } from './stores/savedArticles';
import { useMembershipStore } from './stores/membership';
import { useInterestsStore } from './stores/interests';
import { useParticipationStore } from './stores/participation';
import { useFeedsStore } from './stores/feeds';
import { persist } from './stores/persist';
// @nativescript/vite only applies a file named app.css automatically —
// therefore import the SCSS as a string and register it ourselves.
import appCss from './app.scss?inline';

Application.addCss(appCss);

// Static import — require() does not yield a constructor under Vite/ESM
registerElement('AWebView', () => AWebView);

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

if (__ANDROID__) {
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
