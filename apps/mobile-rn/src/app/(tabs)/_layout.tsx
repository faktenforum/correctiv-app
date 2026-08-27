import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/player/MiniPlayer';
import { useColors } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * An explicit height, because the mini player has to sit exactly on top of the tab
 * bar and needs a value both sides agree on. Left unset, react-navigation adds the
 * safe area itself — here both are done by hand.
 */
const TAB_BAR_HEIGHT = 56;

function tabIcon(active: IoniconName, inactive: IoniconName) {
  const TabIcon = ({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) => <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  TabIcon.displayName = `TabIcon(${active})`;
  return TabIcon;
}

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          /**
           * Bottom tabs default to `animation: 'none'` — the screen is simply
           * replaced, which on five sibling tabs reads as a redraw rather than a
           * move. 'shift' slides the outgoing and incoming screen against each
           * other in the direction of the tab order, so a switch looks like one.
           */
          animation: 'shift',
          tabBarActiveTintColor: colors.emphasis,
          tabBarInactiveTintColor: colors['grey-500'],
          // Page surface, hairline on top, no shadow — as the design draft has it.
          tabBarStyle: {
            backgroundColor: colors['grey-100'],
            borderTopColor: colors['grey-300'],
            borderTopWidth: 1,
            elevation: 0,
            height: barHeight,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
        />
        <Tabs.Screen
          name="entdecken"
          options={{ title: 'Entdecken', tabBarIcon: tabIcon('compass', 'compass-outline') }}
        />
        <Tabs.Screen
          name="mediathek"
          options={{
            title: 'Mediathek',
            tabBarIcon: tabIcon('play-circle', 'play-circle-outline'),
          }}
        />
        <Tabs.Screen
          name="mitmachen"
          options={{ title: 'Mitmachen', tabBarIcon: tabIcon('people', 'people-outline') }}
        />
        <Tabs.Screen
          name="profil"
          options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }}
        />
      </Tabs>

      {/*
        The mini player sits ON TOP of the tab bar — the arrangement the design
        draft uses.

        Als Overlay und NICHT über die `tabBar`-Prop mit `BottomTabBar`: dieser
        Import aus `expo-router/tabs` zieht eine zweite React-Instanz ins Bundle,
        und die ganze App stirbt beim Start mit React-Fehler #321 („invalid hook
        call") — bei grünem Build, grünem Typecheck und grünen Tests. Im Browser
        gefunden, siehe ADR 0004.

        `box-none` lässt Tipps durch, solange nichts läuft (dann rendert MiniPlayer
        null und hier steht eine leere, unsichtbare Zeile).
      */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0"
        style={{ bottom: barHeight }}
      >
        <MiniPlayer />
      </View>
    </View>
  );
}
