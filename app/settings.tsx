import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, Divider, fonts, Heading, Screen, SmoothSwitch, useTheme } from '@/src/components/ui';
import { useApp } from '@/src/context/app-context';
import { clearRecoveryHistory, clearStructuredData, deleteAllPhotoRecords, initializeDatabase, listMedicationEvents, listRoutineEvents } from '@/src/lib/db';
import { cancelAllReminders, cancelReminder } from '@/src/lib/notifications';
import { deleteAllPrivatePhotos } from '@/src/lib/photos';
import { notificationIdsForDeletion } from '@/src/lib/reminder-state';

export default function SettingsScreen() {
  const theme = useTheme();
  const { biometricEnabled, darkModeEnabled, setBiometricEnabled, setDarkModeEnabled, refresh } = useApp();
  const [dataBusy, setDataBusy] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [darkModeBusy, setDarkModeBusy] = useState(false);
  const [biometricSwitch, setBiometricSwitch] = useState(biometricEnabled);
  const [darkModeSwitch, setDarkModeSwitch] = useState(darkModeEnabled);

  useEffect(() => {
    if (!biometricBusy) setBiometricSwitch(biometricEnabled);
  }, [biometricBusy, biometricEnabled]);

  useEffect(() => {
    if (!darkModeBusy) setDarkModeSwitch(darkModeEnabled);
  }, [darkModeBusy, darkModeEnabled]);

  function toggleBiometric(enabled: boolean) {
    setBiometricSwitch(enabled);
    setBiometricBusy(true);
    void setBiometricEnabled(enabled)
      .catch((reason) => {
        setBiometricSwitch(biometricEnabled);
        Alert.alert('Could not change app lock', reason instanceof Error ? reason.message : 'Please try again.');
      })
      .finally(() => setBiometricBusy(false));
  }

  function toggleDarkMode(enabled: boolean) {
    setDarkModeSwitch(enabled);
    setDarkModeBusy(true);
    void setDarkModeEnabled(enabled)
      .catch((reason) => {
        setDarkModeSwitch(darkModeEnabled);
        Alert.alert('Could not change appearance', reason instanceof Error ? reason.message : 'Please try again.');
      })
      .finally(() => setDarkModeBusy(false));
  }

  function deleteRecoveryData() {
    Alert.alert('Delete recovery history?', 'This removes every check-in, journal entry, “When I Recover” item, and medication or routine event. Your saved schedules, setup, essentials, and photos stay in place.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete history', style: 'destructive', onPress: () => void (async () => {
        setDataBusy(true);
        try {
          const [medicationEvents, routineEvents] = await Promise.all([listMedicationEvents(), listRoutineEvents()]);
          await Promise.all(notificationIdsForDeletion([...medicationEvents, ...routineEvents]).map(cancelReminder));
          await clearRecoveryHistory();
          Alert.alert('Recovery history deleted', 'Your schedules, setup, essentials, privacy settings, and photos were left untouched.');
        } catch (reason) {
          Alert.alert('Could not delete recovery history', reason instanceof Error ? reason.message : 'Please try again.');
        } finally {
          setDataBusy(false);
        }
      })() },
    ]);
  }

  function deletePhotos() {
    Alert.alert('Delete every private photo?', 'All private photo files and their timeline records will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete photos', style: 'destructive', onPress: () => void (async () => {
        setDataBusy(true);
        try {
          deleteAllPrivatePhotos();
          await deleteAllPhotoRecords();
          Alert.alert('Private photos deleted');
        } catch (reason) {
          Alert.alert('Could not delete photos', reason instanceof Error ? reason.message : 'Please try again.');
        } finally {
          setDataBusy(false);
        }
      })() },
    ]);
  }

  function deleteEverything() {
    Alert.alert('Delete everything?', 'All check-ins, journal entries, future plans, settings, reminders, and private photos will be permanently deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: () => void (async () => {
        setDataBusy(true);
        try {
          await cancelAllReminders();
          deleteAllPrivatePhotos();
          await clearStructuredData();
          await initializeDatabase();
          await refresh();
          router.dismissAll();
          router.replace('/onboarding');
        } catch (reason) {
          Alert.alert('Could not delete all data', reason instanceof Error ? reason.message : 'Please try again.');
        } finally {
          setDataBusy(false);
        }
      })() },
    ]);
  }

  const aboutLinks = [
    { title: 'My story', subtitle: 'Read the note that started this', icon: 'heart-outline' as const, onPress: () => router.push({ pathname: '/onboarding', params: { from: 'settings' } }) },
    { title: 'Recovery setup', subtitle: 'Change your name, path, or current stage', icon: 'person-outline' as const, onPress: () => router.push({ pathname: '/setup', params: { from: 'settings' } }) },
    { title: 'Daily routine', subtitle: 'Change tasks, times, and quiet reminders', icon: 'list-outline' as const, onPress: () => router.push('/reminders') },
  ];

  return (
    <Screen>
      <BackButton />
      <Heading title="Settings & privacy" subtitle="Your recovery belongs to you." />

      <View style={[styles.privacyStatement, { borderTopColor: theme.borderSoft, borderBottomColor: theme.borderSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={26} color={theme.ink} />
        <Text style={[styles.privacyTitle, { color: theme.ink }]}>Private by default.</Text>
        <Text style={[styles.paragraph, { color: theme.muted }]}>No account, cloud sync, advertising, or behavioral analytics. Recovery records live locally; optional purchases share only purchase information with the app store and RevenueCat.</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.ink }]}>Appearance</Text>
      <View style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <Text style={[styles.rowTitle, { color: theme.ink }]}>Dark mode</Text>
          <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Use the darker palette throughout the app.</Text>
        </View>
        <SmoothSwitch
          label="Dark mode"
          disabled={darkModeBusy}
          value={darkModeSwitch}
          onValueChange={toggleDarkMode}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.ink }]}>Privacy</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/privacy-policy')} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Ionicons name="document-text-outline" size={21} color={theme.muted} />
        <View style={styles.settingCopy}>
          <Text style={[styles.rowTitle, { color: theme.ink }]}>Privacy Policy</Text>
          <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Read how health data, permissions, and third-party purchase services are handled.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
      </Pressable>
      <Divider />
      <View style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <Text style={[styles.rowTitle, { color: theme.ink }]}>App lock</Text>
          <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Use device authentication when opening the app.</Text>
        </View>
        <SmoothSwitch
          label="App lock"
          disabled={biometricBusy}
          value={biometricSwitch}
          onValueChange={toggleBiometric}
        />
      </View>
      <Divider />
      <View style={styles.infoRow}><Ionicons name="finger-print" size={18} color={theme.subtle} /><Text style={[styles.infoText, { color: theme.muted }]}>Authentication is handled by your device. The app does not receive your biometric data.</Text></View>
      <View style={styles.infoRow}><Ionicons name="images-outline" size={18} color={theme.subtle} /><Text style={[styles.infoText, { color: theme.muted }]}>Private photos are never shown on Home or exposed as timeline thumbnails.</Text></View>

      <Text style={[styles.sectionTitle, { color: theme.ink }]}>Data</Text>
      <View style={[styles.dataGroup, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.dataTitle, { color: theme.ink }]}>Delete recovery history</Text>
        <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Check-ins, journal pages, future plans, and medication or routine events.</Text>
        <Button title="Delete recovery history" disabled={dataBusy} kind="danger" onPress={deleteRecoveryData} />
      </View>
      <View style={[styles.dataGroup, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.dataTitle, { color: theme.ink }]}>Delete private photos</Text>
        <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Every photo file and photo timeline record.</Text>
        <Button title="Delete all photos" disabled={dataBusy} kind="danger" onPress={deletePhotos} />
      </View>
      <View style={[styles.dataGroup, { borderColor: theme.danger }]}>
        <Text style={[styles.dataTitle, { color: theme.danger }]}>Delete everything</Text>
        <Text style={[styles.rowSubtitle, { color: theme.muted }]}>Erase the app completely and return to the opening story.</Text>
        <Button title={dataBusy ? 'Working...' : 'Delete all app data'} disabled={dataBusy} kind="danger" onPress={deleteEverything} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.ink }]}>About</Text>
      <View>
        {aboutLinks.map((item, index) => (
          <View key={item.title}>
            {index ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <Ionicons name={item.icon} size={20} color={theme.muted} />
              <View style={styles.settingCopy}><Text style={[styles.rowTitle, { color: theme.ink }]}>{item.title}</Text><Text style={[styles.rowSubtitle, { color: theme.muted }]}>{item.subtitle}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[styles.safety, { borderTopColor: theme.borderSoft }]}>
        <Text style={[styles.safetyTitle, { color: theme.ink }]}>A companion, not a clinician.</Text>
        <Text style={[styles.paragraph, { color: theme.muted }]}>Fistula Tracker does not assess wounds, detect infection, predict healing, or recommend treatment.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  privacyStatement: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 23, gap: 8 },
  privacyTitle: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 37 },
  paragraph: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27, marginTop: 19 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 66 },
  settingCopy: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  rowSubtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 5 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  dataGroup: { borderWidth: 1, borderRadius: 17, padding: 17, gap: 10 },
  dataTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 68, paddingVertical: 12 },
  safety: { borderTopWidth: 1, paddingTop: 20, gap: 6, marginTop: 9 },
  safetyTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  pressed: { opacity: 0.55 },
});
