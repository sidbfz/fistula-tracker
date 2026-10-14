import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, fonts, Heading, Screen, useTheme } from '@/src/components/ui';
import { PRIVACY_POLICY_UPDATED, privacyPolicySections } from '@/src/lib/privacy-policy';



export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <BackButton label="Settings" />
      <Heading title="Privacy Policy" subtitle="Clear language about what stays private and how this app works." />

      <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={25} color={theme.ink} />
        <Text style={[styles.summaryTitle, { color: theme.ink }]}>Your recovery data stays on your device.</Text>
        <Text style={[styles.updated, { color: theme.subtle }]}>Last updated {PRIVACY_POLICY_UPDATED}</Text>
      </View>

      <View style={styles.sections}>
        {privacyPolicySections.map((section, index) => (
          <View key={section.title} style={[styles.section, index > 0 && { borderTopColor: theme.borderSoft, borderTopWidth: 1 }]}>
            <Text style={[styles.title, { color: theme.ink }]}>{section.title}</Text>
            <Text style={[styles.body, { color: theme.muted }]}>{section.body}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.finalNote, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.finalTitle, { color: theme.ink }]}>No hidden collection.</Text>
        <Text style={[styles.body, { color: theme.muted }]}>Every feature is free. Your recovery records stay on this device. Feedback emails are sent only when you choose to send them.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 20, padding: 19, gap: 7 },
  summaryTitle: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 36 },
  updated: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  sections: { gap: 0 },
  section: { paddingVertical: 20, gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  finalNote: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 7, marginBottom: 8 },
  finalTitle: { fontFamily: fonts.serifItalic, fontSize: 27, lineHeight: 34 },
});
