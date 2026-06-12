import { $navigateTo, $navigateBack } from 'nativescript-vue';
import type { NavigateToOptions } from 'nativescript-vue/dist/plugins/navigation';
import type { Component } from 'nativescript-vue';
import { useSettingsStore, type TabId } from '../stores/settings';

/**
 * Kapselt die Frame-pro-Tab-Navigation. Mit fünf parallelen Frames ist
 * Frame.topmost() mehrdeutig — deshalb wird IMMER mit expliziter Frame-ID
 * navigiert, aufgelöst über den aktiven Tab.
 */
export function useNavigation() {
  const settings = useSettingsStore();

  function navigate(component: Component, options: NavigateToOptions<Record<string, unknown>> = {}) {
    return $navigateTo(component, { frame: `tab-${settings.activeTab}`, ...options });
  }

  /** Quersprung: Tab wechseln und dort eine Seite pushen (z.B. Home-Mitmach-Karte → Tab 4). */
  function navigateInTab(tab: TabId, component?: Component, options: NavigateToOptions<Record<string, unknown>> = {}) {
    settings.setActiveTab(tab);
    if (component) return $navigateTo(component, { frame: `tab-${tab}`, ...options });
  }

  function goBack() {
    return $navigateBack({ frame: `tab-${settings.activeTab}` });
  }

  return { navigate, navigateInTab, goBack };
}
