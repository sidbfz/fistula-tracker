import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, fonts, Heading, Screen, useTheme } from '@/src/components/ui';
import { getAppDetails } from '@/src/lib/app-info';
import { createFeedbackDraft, FEEDBACK_EMAIL } from '@/src/lib/feedback';

export default function FeedbackScreen() {
  const theme = useTheme();
  const details = getAppDetails();
  const draft = createFeedbackDraft(details);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDraft() {
    setOpening(true);
    setError(null);
    try {
      await Linking.openURL(draft.url);
    } catch {
      setError('An email app could not be opened. You can email the address below from any mail app, or copy the draft text.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen>
      <BackButton label="Settings" />
      <Heading title="Send feedback" subtitle="Something confusing or not working? Tell me what happened so I can improve it." />
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Ionicons name="mail-outline" size={25} color={theme.ink} />
        <Text selectable style={[styles.email, { color: theme.ink }]}>{FEEDBACK_EMAIL}</Text>
        <Text style={[styles.body, { color: theme.muted }]}>The draft includes only the app version and operating system version shown below. No recovery records, photos, logs or device identifiers are attached. You can edit the draft before sending.</Text>
        <Text style={[styles.detail, { color: theme.muted }]}>Version {details.version} · Build {details.build}{'\n'}{details.platform} {details.systemVersion}</Text>
        <Button title={opening ? 'Opening email…' : 'Open email draft'} icon="mail-outline" disabled={opening} onPress={() => void openDraft()} />
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.danger }]}>{error}</Text> : null}
      </View>
      <Text style={[styles.title, { color: theme.ink }]}>What to include</Text>
      <Text style={[styles.body, { color: theme.muted }]}>Describe the screen you used, the steps you took, what happened and what you expected. Fictional examples are enough. Please leave out medical details and private images.</Text>
      <Text style={[styles.body, { color: theme.muted }]}>Your email is sent only when you choose Send in your mail app. The developer and your email provider will process the information you choose to send.</Text>
      <Text style={[styles.title, { color: theme.ink }]}>Draft text</Text>
      <Text selectable style={[styles.draft, { color: theme.muted, borderColor: theme.borderSoft }]}>{draft.body}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 20, padding: 19, gap: 13 },
  email: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  detail: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  draft: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, borderWidth: 1, borderRadius: 16, padding: 16 },
});
