import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedStage, Button, ChoiceRow, Divider, EmphasisText, EmptyState, Field, fonts, ProgressIndicator, Screen, SelectionFade, useTheme } from '@/src/components/ui';
import { formatDate, todayISO } from '@/src/lib/date';
import { deleteDailyLog, listDailyLogs, listMedicationEvents, listMedications, saveDailyLog, saveJournalForDate, saveMedicationEvent } from '@/src/lib/db';
import { hasRecordedStatus, localISOTimestamp, scheduledTimestamp } from '@/src/lib/schedule';
import { includesDate, parseWeekdays } from '@/src/lib/weekdays';
import type { DailyLog, DailyLogInput, MedicationEvent, MedicationWithTimes } from '@/src/types';

const levelOptions = ['None', 'A little', 'Moderate', 'A lot'].map((label, value) => ({ label, value }));
const totalSteps = 6;

function blankLog(date = todayISO()): DailyLogInput {
  return { log_date: date, pain: 0, bleeding: 0, drainage: 0, bowel_movement: 0, sitz_bath: 0, dressing_changed: 0, medication_taken: 0, notes: '' };
}

export default function CheckInScreen() {
  const theme = useTheme();
  const [form, setForm] = useState<DailyLogInput>(blankLog());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [medications, setMedications] = useState<MedicationWithTimes[]>([]);
  const [medicationEvents, setMedicationEvents] = useState<MedicationEvent[]>([]);
  const [selectedMedicationKeys, setSelectedMedicationKeys] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [journalFocused, setJournalFocused] = useState(false);
  const editingPast = form.log_date !== todayISO();
  const existingLog = logs.find((row) => row.log_date === form.log_date);

  const load = useCallback(async () => {
    const [rows, savedMedications, savedMedicationEvents] = await Promise.all([listDailyLogs(), listMedications(), listMedicationEvents()]);
    setLogs(rows);
    setMedications(savedMedications);
    setMedicationEvents(savedMedicationEvents);
    if (!editingPast) {
      const today = rows.find((row) => row.log_date === todayISO());
      setForm(today ? { ...today } : blankLog());
    }
  }, [editingPast]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const previousLogs = useMemo(() => logs.filter((row) => row.log_date !== form.log_date), [logs, form.log_date]);
  const checkInDate = useMemo(() => new Date(`${form.log_date}T12:00:00`), [form.log_date]);
  const scheduledMedicines = useMemo(() => medications.flatMap((medication) => {
    if (medication.status !== 'active' || medication.kind !== 'scheduled' || !includesDate(parseWeekdays(medication.weekdays), checkInDate)) return [];
    return medication.times.map((time) => ({ medication, time, key: `${medication.id}-${time.id}` }));
  }), [checkInDate, medications]);

  function edit(log: DailyLog) {
    setSelectedMedicationKeys([]);
    setForm({ ...log });
    setStep(0);
    setShowHistory(false);
  }

  function change<K extends keyof DailyLogInput>(key: K, value: DailyLogInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const recordedMedicine = scheduledMedicines.some((item) => {
        const scheduledFor = scheduledTimestamp(item.time.time, checkInDate);
        return selectedMedicationKeys.includes(item.key) || hasRecordedStatus(medicationEvents.filter((event) => event.medication_id === item.medication.id), scheduledFor, checkInDate);
      });
      await saveDailyLog({ ...form, medication_taken: recordedMedicine ? 1 : 0 });
      await saveJournalForDate(form.log_date, form.notes);
      for (const item of scheduledMedicines) {
        if (!selectedMedicationKeys.includes(item.key)) continue;
        const scheduledFor = scheduledTimestamp(item.time.time, checkInDate);
        const alreadyRecorded = hasRecordedStatus(medicationEvents.filter((event) => event.medication_id === item.medication.id), scheduledFor, checkInDate);
        if (!alreadyRecorded && scheduledFor) await saveMedicationEvent({ medication_id: item.medication.id, medication_name: item.medication.name, status: 'taken', occurred_at: localISOTimestamp(new Date(scheduledFor)), scheduled_for: scheduledFor });
      }
      await load();
      router.replace('/(tabs)');
    } catch (reason) {
      Alert.alert('Could not save', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(log: DailyLog) {
    Alert.alert('Delete this check-in?', `The entry for ${formatDate(log.log_date)} cannot be recovered.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void (async () => {
        await deleteDailyLog(log.id);
        if (form.log_date === log.log_date) setForm(blankLog());
        await load();
      })() },
    ]);
  }

  if (showHistory) {
    return (
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => setShowHistory(false)} style={styles.backRow}>
          <Ionicons name="arrow-back" size={18} color={theme.ink} />
          <Text style={[styles.backText, { color: theme.ink }]}>Today</Text>
        </Pressable>
        <Text style={[styles.historyTitle, { color: theme.ink }]}>Past check-ins</Text>
        <Text style={[styles.support, { color: theme.muted }]}>Your own record, in your own words.</Text>
        <View style={styles.historyList}>
          {previousLogs.length ? previousLogs.map((log, index) => (
            <View key={log.id}>
              {index ? <Divider /> : null}
              <Pressable onPress={() => edit(log)} style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}>
                <View style={styles.dateBlock}>
                  <Text style={[styles.day, { color: theme.ink }]}>{log.log_date.slice(-2)}</Text>
                  <Text style={[styles.month, { color: theme.subtle }]}>{new Date(`${log.log_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</Text>
                </View>
                <View style={styles.historyCopy}>
                  <Text style={[styles.historyDate, { color: theme.ink }]}>{formatDate(log.log_date)}</Text>
                  <Text style={[styles.summary, { color: theme.muted }]}>Pain {log.pain} · {levelOptions[log.bleeding].label.toLowerCase()} bleeding · {levelOptions[log.drainage].label.toLowerCase()} drainage</Text>
                  {log.notes ? <Text style={[styles.notePreview, { color: theme.muted }]} numberOfLines={2}>{log.notes}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => confirmDelete(log)} hitSlop={10} style={styles.deleteLink}>
                <Text style={[styles.deleteText, { color: theme.danger }]}>Delete</Text>
              </Pressable>
            </View>
          )) : <EmptyState icon="calendar-outline">No earlier check-ins yet. Your days will gather here over time.</EmptyState>}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={step === totalSteps - 1}>
      <View style={styles.flow}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={() => step ? setStep(step - 1) : router.back()} hitSlop={10} style={styles.backRow}>
              <Ionicons name="arrow-back" size={18} color={theme.ink} />
              <Text style={[styles.backText, { color: theme.ink }]}>{step ? 'Back' : 'Home'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setShowHistory(true)} hitSlop={10}>
              <Text style={[styles.historyLink, { color: theme.muted }]}>Past days</Text>
            </Pressable>
          </View>
          <ProgressIndicator current={step + 1} total={totalSteps} />
        </View>

        <AnimatedStage stageKey={step} style={styles.questionArea}>
          <Text style={[styles.dateLabel, { color: theme.subtle }]}>{editingPast ? `Editing ${formatDate(form.log_date)}` : 'Today'}</Text>

          {step === 0 ? (
            <>
              <EmphasisText before="How bad is the pain " emphasis="today?" style={styles.question} />
              <View style={styles.scoreLine}>
                <Text style={[styles.score, { color: theme.ink }]}>{form.pain}</Text>
                <Text style={[styles.outOf, { color: theme.muted }]}>out of 10</Text>
              </View>
              <ChoiceRow value={form.pain} onChange={(pain) => change('pain', pain)} options={Array.from({ length: 11 }, (_, value) => ({ label: String(value), value }))} />
              <View style={styles.scaleLabels}><Text style={[styles.scaleText, { color: theme.subtle }]}>No pain</Text><Text style={[styles.scaleText, { color: theme.subtle }]}>Most intense</Text></View>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <EmphasisText before="Any " emphasis="bleeding?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Choose what feels closest. No need to overthink it.</Text>
              <ChoiceRow value={form.bleeding} onChange={(bleeding) => change('bleeding', bleeding)} options={levelOptions} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <EmphasisText before="How’s the " emphasis="drainage?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Just your observation — the app won’t interpret it.</Text>
              <ChoiceRow value={form.drainage} onChange={(drainage) => change('drainage', drainage)} options={levelOptions} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <EmphasisText before="What did you manage " emphasis="today?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Tap anything that happened. This is a record, not a score.</Text>
              <View style={styles.careList}>
                {([
                  ['bowel_movement', 'Bowel movement'],
                  ['sitz_bath', 'Sitz bath'],
                  ['dressing_changed', 'Dressing changed'],
                ] as const).map(([key, label], index) => {
                  const checked = Boolean(form[key]);
                  return (
                    <View key={key}>
                      {index ? <Divider /> : null}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        onPress={() => change(key, checked ? 0 : 1)}
                        style={({ pressed }) => [styles.careRow, pressed && styles.pressed]}>
                        <Text style={[styles.careLabel, { color: theme.ink }]}>{label}</Text>
                        <View style={[styles.checkbox, { borderColor: checked ? theme.ink : theme.border, backgroundColor: checked ? theme.ink : 'transparent' }]}>
                          {checked ? <SelectionFade><Ionicons name="checkmark" size={16} color={theme.invertedInk} /></SelectionFade> : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <EmphasisText before="What medicines did you " emphasis="take?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Only medicines scheduled for this day appear here. Tap what you took; this does not calculate dose safety.</Text>
              {scheduledMedicines.length ? <View style={styles.careList}>{scheduledMedicines.map((item, index) => {
                const scheduledFor = scheduledTimestamp(item.time.time, checkInDate);
                const recorded = hasRecordedStatus(medicationEvents.filter((event) => event.medication_id === item.medication.id), scheduledFor, checkInDate);
                const checked = recorded || selectedMedicationKeys.includes(item.key);
                return <View key={item.key}>{index ? <Divider /> : null}<Pressable disabled={recorded} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: recorded }} onPress={() => setSelectedMedicationKeys((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} style={styles.careRow}><View><Text style={[styles.careLabel, { color: theme.ink }]}>{item.medication.name}</Text><Text style={[styles.medicationHint, { color: theme.muted }]}>{item.time.time}{recorded ? ' · already recorded' : ''}</Text></View><View style={[styles.checkbox, { borderColor: checked ? theme.ink : theme.border, backgroundColor: checked ? theme.ink : 'transparent' }]}>{checked ? <Ionicons name="checkmark" size={16} color={theme.invertedInk} /> : null}</View></Pressable></View>;
              })}</View> : <EmptyState icon="medical-outline">No medicines are scheduled for this day.</EmptyState>}
              <Pressable accessibilityRole="link" onPress={() => router.push('/medications')} style={[styles.medicationLink, { borderColor: theme.borderSoft }]}><Text style={[styles.careLabel, { color: theme.ink }]}>Manage medicines</Text><Ionicons name="chevron-forward" size={18} color={theme.subtle} /></Pressable>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <EmphasisText before="Journal — anything you want to " emphasis="remember?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Optional. This is your Journal entry for today, so you can return to the same words later.</Text>
              <Field
                multiline
                value={form.notes}
                onChangeText={(notes) => change('notes', notes)}
                onFocus={() => setJournalFocused(true)}
                onBlur={() => setJournalFocused(false)}
                placeholder="Write something, if you want..."
              />
              {journalFocused ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done typing"
                  onPress={Keyboard.dismiss}
                  style={({ pressed }) => [styles.dismissKeyboard, { borderColor: theme.border }, pressed && styles.pressed]}>
                  <Ionicons name="chevron-down" size={17} color={theme.muted} />
                  <Text style={[styles.dismissKeyboardText, { color: theme.muted }]}>Done typing</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </AnimatedStage>

        <View style={styles.footer}>
          <Button
            title={step === totalSteps - 1 ? saving ? 'Saving...' : existingLog ? editingPast ? 'Update this day' : 'Update today' : 'Save today' : 'Continue'}
            disabled={saving}
            icon={step === totalSteps - 1 ? 'checkmark' : 'arrow-forward'}
            onPress={step === totalSteps - 1 ? () => void save() : () => setStep(step + 1)}
          />
          {step === totalSteps - 1 && existingLog ? (
            <Pressable accessibilityRole="button" onPress={() => confirmDelete(existingLog)} style={styles.centerLink}>
              <Text style={[styles.deleteText, { color: theme.danger }]}>Delete this check-in</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flow: { flex: 1, minHeight: 0 },
  top: { gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 40 },
  backText: { fontFamily: fonts.medium, fontSize: 15 },
  historyLink: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  questionArea: { flex: 1, justifyContent: 'center', gap: 18, paddingVertical: 20 },
  dateLabel: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  question: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 56, letterSpacing: -0.7, maxWidth: 360 },
  support: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, maxWidth: 345 },
  scoreLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  score: { fontFamily: fonts.serif, fontSize: 72, lineHeight: 72 },
  outOf: { fontFamily: fonts.regular, fontSize: 16 },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -7 },
  scaleText: { fontFamily: fonts.regular, fontSize: 13 },
  careList: { marginTop: 4 },
  careRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, paddingVertical: 9 },
  careLabel: { fontFamily: fonts.medium, fontSize: 17 },
  medicationLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 11, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  medicationCopy: { flex: 1, gap: 2 },
  medicationHint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  checkbox: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 11, paddingBottom: 4 },
  dismissKeyboard: { alignSelf: 'flex-end', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  dismissKeyboardText: { fontFamily: fonts.medium, fontSize: 15 },
  centerLink: { alignItems: 'center', paddingVertical: 5 },
  deleteText: { fontFamily: fonts.medium, fontSize: 15 },
  pressed: { opacity: 0.55 },
  historyTitle: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 42, letterSpacing: -0.4 },
  historyList: { marginTop: 11 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17 },
  dateBlock: { width: 43, alignItems: 'center' },
  day: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 30 },
  month: { fontFamily: fonts.medium, fontSize: 13 },
  historyCopy: { flex: 1, gap: 3 },
  historyDate: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21 },
  summary: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  notePreview: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, marginTop: 4 },
  deleteLink: { alignSelf: 'flex-end', paddingBottom: 10, paddingLeft: 16 },
});
