import { $navigateTo, $navigateBack } from 'nativescript-vue';
import type { NavigateToOptions } from 'nativescript-vue/dist/plugins/navigation';
import type { Component } from 'nativescript-vue';
import { useSettingsStore, type TabId } from '../stores/settings';

/**
 * Encapsulates the frame-per-tab navigation. With five parallel frames
 * Frame.topmost() is ambiguous — therefore navigation ALWAYS uses an explicit
 * frame ID, resolved via the active tab.
 */
export function useNavigation() {
  const settings = useSettingsStore();

  function navigate(component: Component, options: NavigateToOptions<Record<string, unknown>> = {}) {
    return $navigateTo(component, { frame: `tab-${settings.activeTab}`, ...options });
  }

  /** Cross-jump: switch tab and push a page there (e.g. home participate card → tab 4). */
  function navigateInTab(tab: TabId, component?: Component, options: NavigateToOptions<Record<string, unknown>> = {}) {
    settings.setActiveTab(tab);
    if (component) return $navigateTo(component, { frame: `tab-${tab}`, ...options });
  }

  function goBack() {
    return $navigateBack({ frame: `tab-${settings.activeTab}` });
  }

  return { navigate, navigateInTab, goBack };
}
