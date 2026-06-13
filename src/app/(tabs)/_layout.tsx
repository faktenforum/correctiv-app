import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emphasis,
        tabBarInactiveTintColor: colors['grey-500'],
        // Weiß, Hairline oben, keine Schatten (Designvorgabe).
        tabBarStyle: {
          backgroundColor: colors['grey-100'],
          borderTopColor: colors['grey-300'],
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11 },
      }}>
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
        options={{ title: 'Mediathek', tabBarIcon: tabIcon('play-circle', 'play-circle-outline') }}
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
  );
}
