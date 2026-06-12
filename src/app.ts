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
import { persist } from './stores/persist';
// @nativescript/vite wendet nur eine Datei namens app.css automatisch an —
// SCSS deshalb als String importieren und selbst registrieren.
import appCss from './app.scss?inline';

Application.addCss(appCss);

// Statischer Import — require() liefert unter Vite/ESM keinen Konstruktor
registerElement('AWebView', () => AWebView);

const pinia = createPinia();
const app = createApp(AppShell);
app.use(pinia);
app.use(CollectionViewPlugin);

const settings = useSettingsStore(pinia);
persist(settings, PERSISTED_KEYS);
persist(useSavedArticlesStore(pinia), ['items']);
persist(useMembershipStore(pinia), ['isMember', 'memberSince', 'amountEur', 'interval', 'paused']);

if (__ANDROID__) {
  // Mit fünf parallelen Frames poppt der Hardware-Back-Button sonst beliebige
  // Frames: erst im aktiven Tab zurück, dann zum Home-Tab, dann Default.
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

app.start();
