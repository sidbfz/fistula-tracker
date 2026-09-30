import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/src/components/ui';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.ink,
        tabBarInactiveTintColor: theme.subtle,
        sceneStyle: { backgroundColor: theme.background },
        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 11),
          borderTopColor: theme.borderSoft,
          borderTopWidth: 1,
          backgroundColor: theme.surface,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
        tabBarItemStyle: { gap: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="timeline" options={{ title: 'Recovery', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="notes" options={{ title: 'Journal', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="check-in" options={{ href: null }} />
    </Tabs>
  );
}
