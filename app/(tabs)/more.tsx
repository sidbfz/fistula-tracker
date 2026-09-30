import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Divider, fonts, Heading, Reveal, Screen, useTheme } from '@/src/components/ui';

const items = [
  { title: 'Medicines', subtitle: 'Schedules and timestamped history', icon: 'medical-outline' as const, route: '/medications' as const },
  { title: 'Daily routine', subtitle: 'Your own care instructions, organized', icon: 'list-outline' as const, route: '/reminders' as const },
  { title: 'Recovery essentials', subtitle: 'Patient-shared ideas and your own list', icon: 'bag-handle-outline' as const, route: '/essentials' as const },
  { title: 'Private photos', subtitle: 'A discreet visual timeline', icon: 'lock-closed-outline' as const, route: '/photos' as const },
  { title: 'When I Recover', subtitle: 'Things worth getting better for', icon: 'sparkles-outline' as const, route: '/recovery-list' as const },
  { title: 'Support the app', subtitle: 'Optional support; recovery tools stay free', icon: 'heart-outline' as const, route: '/support' as const },
  { title: 'Settings & privacy', subtitle: 'App lock, your data, and the story', icon: 'shield-checkmark-outline' as const, route: '/settings' as const },
];

export default function MoreScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <Heading title="More" subtitle="The quiet details behind your recovery space." />
      <View style={styles.menu}>
        {items.map((item, index) => (
          <View key={item.route}>
            {index ? <Divider /> : null}
            <Reveal delay={index * 55}><Pressable accessibilityRole="button" onPress={() => router.push(item.route)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <Ionicons name={item.icon} size={21} color={theme.muted} />
              <View style={styles.copy}>
                <Text style={[styles.title, { color: theme.ink }]}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
            </Pressable></Reveal>
          </View>
        ))}
      </View>
      <View style={styles.privateNote}>
        <Ionicons name="lock-closed" size={13} color={theme.subtle} />
        <Text style={[styles.privateText, { color: theme.subtle }]}>Your recovery information remains on this device.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: { paddingTop: 7 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 77, paddingVertical: 15 },
  copy: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  privateNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingTop: 14 },
  privateText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.55 },
});
