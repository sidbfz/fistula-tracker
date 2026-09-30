import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, ChoiceRow, DateField, Divider, Field, fonts, Heading, InlineRequirement, Label, Screen, useTheme } from '@/src/components/ui';
import { useApp } from '@/src/context/app-context';
import { displayDateToISO, isoToDisplayDate } from '@/src/lib/date';
import { saveProfile } from '@/src/lib/db';

const stages = ['Noticing signs', 'Just diagnosed', 'Waiting for treatment', 'Recently had surgery', 'Recovering', 'Been dealing with this for a while', 'Not sure'];

export default function SetupScreen() {
  const theme = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { displayName, profile, refresh, setDisplayName } = useApp();
  const [name, setName] = useState(displayName);
  const [hadSurgery, setHadSurgery] = useState(profile?.had_surgery ?? 1);
  const [surgeryDate, setSurgeryDate] = useState(profile?.surgery_date ? isoToDisplayDate(profile.surgery_date) : '');
  const [procedureType, setProcedureType] = useState(profile?.procedure_type ?? '');
  const [stage, setStage] = useState(profile?.recovery_stage ?? 'Recovering');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(displayName);
    if (profile) {
      setHadSurgery(profile.had_surgery);
      setSurgeryDate(profile.surgery_date ? isoToDisplayDate(profile.surgery_date) : '');
      setProcedureType(profile.procedure_type ?? '');
      setStage(profile.recovery_stage);
    }
  }, [displayName, profile]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await setDisplayName(name);
      await saveProfile({
        had_surgery: hadSurgery,
        surgery_date: hadSurgery && surgeryDate ? displayDateToISO(surgeryDate) : null,
        procedure_type: hadSurgery && procedureType.trim() ? procedureType.trim() : null,
        recovery_stage: stage,
      });
      await refresh();
      if (from === 'settings') router.back();
      else router.replace('/(tabs)');
    } catch (reason) {
      Alert.alert('Could not save', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {from === 'settings' ? <BackButton /> : null}
      <Heading title="Your recovery" subtitle="Change only what feels useful. Everything here stays on this device." />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>What should I call you?</Text>
        <Field value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
      </View>

      <Divider />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Have you had surgery yet?</Text>
        <ChoiceRow
          value={hadSurgery}
          onChange={(value) => { setHadSurgery(value); if (!value) setStage('Just diagnosed'); }}
          options={[{ label: 'Yes', value: 1 }, { label: 'Not yet', value: 0 }]}
        />
      </View>

      {hadSurgery ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>What do you remember?</Text>
            <Text style={[styles.helper, { color: theme.muted }]}>Both are optional. Not knowing the terminology is completely fine.</Text>
            <Label>Surgery date</Label>
            <DateField value={surgeryDate} onChangeText={setSurgeryDate} />
            <Label>Procedure, if known</Label>
            <Field value={procedureType} onChangeText={setProcedureType} placeholder="I’m not sure" />
          </View>
        </>
      ) : null}

      <Divider />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Where are you in all this right now?</Text>
        <ChoiceRow value={stage} onChange={setStage} options={stages.map((value) => ({ label: value, value }))} />
      </View>

      {!name.trim() ? <InlineRequirement>Enter a first name or nickname to save your recovery details.</InlineRequirement> : null}
      <Button title={saving ? 'Saving...' : 'Save changes'} disabled={saving || !name.trim()} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 13, paddingVertical: 7 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27 },
  helper: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, marginTop: -4 },
});
