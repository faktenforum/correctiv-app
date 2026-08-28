import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/player/MiniPlayer';
import { useColors } from '@/lib/theme';

/**
 * The tab bar on iOS and Android is the system's, not ours.
 *
 * It is the one control in the app a user has already learned somewhere else, so it
 * should behave the way every other app on their phone behaves — the press feedback,
 * the scroll-to-top on a second tap, the iOS 26 minimise-on-scroll, the way it grows
 * with the system font size. All of that is free here and was absent from a drawn
 * bar, which only ever imitated it. The web has no system bar to borrow and keeps
 * the drawn one; see `_layout.web.tsx` for why that is a decision and not a
 * shortfall.
 *
 * Icons are each platform's own vocabulary rather than one set stretched across
 * both: SF Symbols on iOS, Material Symbols on Android, with a filled variant for
 * the selected state on each. Ionicons is still what the rest of the app draws with
 * — it is only the tab bar that defers, because the tab bar is the part users read
 * as belonging to the phone rather than to us.
 *
 * The colours still come from the token palette (`useColors`), so the bar follows
 * the appearance setting like everything else. Only its SHAPE is the platform's.
 *
 * See ADR 0013 for what this costs, which is not nothing: the API is alpha, all five
 * tabs now mount eagerly, and the bar's height can no longer be measured.
 */

const IS_IOS = Platform.OS === 'ios';

/**
 * Where the mini player sits on Android, and the one number here that is a guess.
 *
 * It used to be a value we SET: the old drawn bar took `height: 56 + insets.bottom`
 * from this constant, so the mini player and the bar could not disagree. A native
 * bar sizes itself, and expo-router's native tabs expose no height —
 * `useBottomTabBarHeight` belongs to the JS tabs only, and the documentation says
 * plainly that layout information is unavailable. So the same 56 now means something
 * weaker: what Material's `BottomNavigationView` is expected to be, which is what
 * react-native-screens renders underneath.
 *
 * **Check this on a device before believing it.** If the bar is taller, the mini
 * player overlaps it, and no test in this repo can see that. It is the first thing
 * to look at in a screenshot of a playing track.
 */
const ANDROID_TAB_BAR_HEIGHT = 56;

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  /*
   * Five triggers, written out rather than mapped. Android's Material tabs cap at
   * five, so this list is at its limit — a sixth is a redesign, not an edit, and
   * spelling them out is what makes that visible at the point where someone would
   * add one.
   */
  const tabs = (
    <NativeTabs
      tintColor={colors.emphasis}
      backgroundColor={colors['grey-100']}
      iconColor={{ default: colors['grey-500'], selected: colors.emphasis }}
      labelStyle={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11 }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="entdecken">
        <NativeTabs.Trigger.Label>Entdecken</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'safari', selected: 'safari.fill' }}
          md={{ default: 'explore', selected: 'explore' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mediathek">
        <NativeTabs.Trigger.Label>Mediathek</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'play.circle', selected: 'play.circle.fill' }}
          md={{ default: 'play_circle', selected: 'play_circle' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mitmachen">
        <NativeTabs.Trigger.Label>Mitmachen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          md={{ default: 'groups', selected: 'groups' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md={{ default: 'account_circle', selected: 'account_circle' }}
        />
      </NativeTabs.Trigger>

      {/*
        iOS has a slot for exactly this: the bar above the tab bar that Apple Music
        and Podcasts put the current track in. It is the system's own, so it handles
        the tab bar's height and translucency itself — which is the answer to the
        problem ANDROID_TAB_BAR_HEIGHT above has to guess its way around — and on
        iOS 26 it knows `regular` and `inline` placement without being told.

        Android has no counterpart: NativeTabsView.android.js reads no accessory. So
        the two platforms genuinely differ here, and the overlay below is the Android
        answer rather than a fallback — drawing your own bar above the navigation bar
        is what Android media apps do.
      */}
      {IS_IOS ? (
        <NativeTabs.BottomAccessory>
          <MiniPlayer />
        </NativeTabs.BottomAccessory>
      ) : null}
    </NativeTabs>
  );

  if (IS_IOS) return tabs;

  return (
    <View className="flex-1">
      {tabs}
      {/*
        `box-none` lets taps through while nothing is playing, when MiniPlayer
        renders null and this is an empty, invisible row.
      */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0"
        style={{ bottom: ANDROID_TAB_BAR_HEIGHT + insets.bottom }}
      >
        <MiniPlayer />
      </View>
    </View>
  );
}
