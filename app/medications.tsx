import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, ChoiceRow, Divider, EmptyState, Field, fonts, Heading, InlineRequirement, Label, Screen, SmoothSwitch, TimeField, useTheme } from '@/src/components/ui';
import { deleteMedication, deleteMedicationEvent, getMedication, listMedicationEvents, listMedications, saveMedication, saveMedicationEvent, updateMedicationStatus, updateMedicationTimeNotification } from '@/src/lib/db';
import { cancelReminder, scheduleMedicationReminder, schedulePostponedReminder } from '@/src/lib/notifications';
import { buildReminderPlan, notificationIdsForDeletion } from '@/src/lib/reminder-state';
import { dateAtTime, hasRecordedStatus, localISOTimestamp, scheduledTimestamp } from '@/src/lib/schedule';
import { ALL_WEEKDAYS, includesDate, parseWeekdays, serializeWeekdays, WEEKDAY_OPTIONS, weekdaySummary } from '@/src/lib/weekdays';
import type { MedicationEvent, MedicationWithTimes } from '@/src/types';

type ViewMode = 'list' | 'form' | 'history' | 'action';
type ActionStatus = 'taken' | 'skipped' | 'postponed';

function eventDate(value: string) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function MedicationsScreen() {
  const theme = useTheme();
  const [medications, setMedications] = useState<MedicationWithTimes[]>([]);
  const [events, setEvents] = useState<MedicationEvent[]>([]);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<number | undefined>();
  const [editingStatus, setEditingStatus] = useState<'active' | 'paused' | 'archived'>('active');
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [kind, setKind] = useState<'scheduled' | 'as_needed'>('scheduled');
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [weekdays, setWeekdays] = useState<number[]>([...ALL_WEEKDAYS]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [actionMedication, setActionMedication] = useState<MedicationWithTimes | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('taken');
  const [actionTime, setActionTime] = useState<string | null>(null);
  const [eventNote, setEventNote] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [savedMedications, savedEvents] = await Promise.all([listMedications(true), listMedicationEvents()]);
    setMedications(savedMedications);
    setEvents(savedEvents);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function resetForm() {
    setEditingId(undefined);
    setEditingStatus('active');
    setName('');
    setInstructions('');
    setKind('scheduled');
    setNotes('');
    setTimes(['09:00']);
    setWeekdays([...ALL_WEEKDAYS]);
    setRemindersEnabled(false);
  }

  function openNew() {
    resetForm();
    setMode('form');
  }

  async function openEdit(id: number) {
    const medication = await getMedication(id);
    if (!medication) return;
    setEditingId(id);
    setEditingStatus(medication.status);
    setName(medication.name);
    setInstructions(medication.instructions);
    setKind(medication.kind);
    setNotes(medication.notes);
    setTimes(medication.times.length ? medication.times.map((time) => time.time) : ['09:00']);
    setWeekdays(parseWeekdays(medication.weekdays));
    setRemindersEnabled(medication.times.some((time) => Boolean(time.reminder_enabled)));
    setMode('form');
  }

  async function save() {
    if (!name.trim() || (kind === 'scheduled' && !weekdays.length)) return;
    const savedTimes = kind === 'scheduled' ? [...new Set(times)].sort() : [];
    setBusy(true);
    const createdNotifications: string[] = [];
    let previous: MedicationWithTimes | null = null;
    try {
      previous = editingId ? await getMedication(editingId) : null;
      const scheduledTimes = [];
      for (const time of savedTimes) {
        const notificationId = remindersEnabled && editingStatus === 'active' ? await scheduleMedicationReminder(name.trim(), time, weekdays) : null;
        if (notificationId) createdNotifications.push(notificationId);
        scheduledTimes.push({ time, reminder_enabled: remindersEnabled, notification_id: notificationId });
      }
      await saveMedication({ name, instructions, kind, notes, weekdays: serializeWeekdays(weekdays), status: editingStatus }, scheduledTimes, editingId);
      await Promise.allSettled(previous?.times.map((time) => cancelReminder(time.notification_id)) ?? []);
      await load();
      resetForm();
      setMode('list');
    } catch (reason) {
      await Promise.all(createdNotifications.map((id) => cancelReminder(id)));
      Alert.alert('Could not save medicine', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function openAction(medication: MedicationWithTimes, status: ActionStatus, time: string | null) {
    setActionMedication(medication);
    setActionStatus(status);
    setActionTime(time);
    setEventNote('');
    setPostponeTime(time ?? '');
    setMode('action');
  }

  async function recordAction() {
    if (!actionMedication) return;
    if (actionMedication.kind === 'as_needed' && actionStatus !== 'taken') return;
    let postponedUntil: string | null = null;
    let notificationId: string | null = null;
    if (actionStatus === 'postponed') {
      const date = dateAtTime(postponeTime);
      if (!date) {
        Alert.alert('Choose a time', 'Use a 24-hour time such as 14:30.');
        return;
      }
      postponedUntil = localISOTimestamp(date);
      setBusy(true);
      try {
        notificationId = await schedulePostponedReminder(actionMedication.name, date);
      } catch (reason) {
        setBusy(false);
        Alert.alert('Could not postpone reminder', reason instanceof Error ? reason.message : 'Please try again.');
        return;
      }
    }
    setBusy(true);
    try {
      await saveMedicationEvent({
        medication_id: actionMedication.id,
        medication_name: actionMedication.name,
        status: actionStatus,
        occurred_at: localISOTimestamp(),
        scheduled_for: actionTime ? scheduledTimestamp(actionTime) : null,
        postponed_until: postponedUntil,
        notification_id: notificationId,
        note: eventNote,
      });
      await load();
      setMode('list');
    } catch (reason) {
      await cancelReminder(notificationId);
      Alert.alert('Could not record this', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(medication: MedicationWithTimes, status: 'active' | 'paused' | 'archived') {
    setBusy(true);
    try {
      if (status !== 'active') {
        for (const time of medication.times) {
          const plan = buildReminderPlan(time.notification_id, false, Boolean(time.reminder_enabled), time.time);
          await cancelReminder(plan.cancelNotificationId);
          // Keep the user's reminder preference so Resume can restore it.
          await updateMedicationTimeNotification(time.id, Boolean(time.reminder_enabled), null);
        }
      } else {
        for (const time of medication.times) {
          const plan = buildReminderPlan(time.notification_id, true, Boolean(time.reminder_enabled), time.time);
          await cancelReminder(plan.cancelNotificationId);
          const notificationId = plan.shouldSchedule
            ? await scheduleMedicationReminder(medication.name, time.time, parseWeekdays(medication.weekdays))
            : null;
          await updateMedicationTimeNotification(time.id, Boolean(time.reminder_enabled), notificationId);
        }
      }
      await updateMedicationStatus(medication.id, status);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(medication: MedicationWithTimes) {
    Alert.alert('Delete this medicine?', 'You can keep its factual history or remove that history too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete, keep history', onPress: () => void removeMedication(medication, false) },
      { text: 'Delete with history', style: 'destructive', onPress: () => void removeMedication(medication, true) },
    ]);
  }

  async function removeMedication(medication: MedicationWithTimes, deleteHistory: boolean) {
    setBusy(true);
    try {
      await Promise.all(medication.times.map((time) => cancelReminder(time.notification_id)));
      await Promise.all(notificationIdsForDeletion(events.filter((event) => event.medication_id === medication.id)).map(cancelReminder));
      await deleteMedication(medication.id, deleteHistory);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(event: MedicationEvent) {
    await cancelReminder(event.notification_id);
    await deleteMedicationEvent(event.id);
    await load();
  }

  function recordedToday(medication: MedicationWithTimes, time: string) {
    return hasRecordedStatus(
      events.filter((event) => event.medication_id === medication.id),
      scheduledTimestamp(time),
    );
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((left, right) => left - right));
  }

  if (mode === 'form') {
    return (
      <Screen>
        <BackButton label="Medicines" />
        <Heading title={editingId ? 'Edit medicine' : 'Add a medicine'} subtitle="Copy the wording from your label. You can change this later; the app will remember it, not interpret it." />
        <Label>Name</Label><Field value={name} onChangeText={setName} placeholder="Medicine name" autoCapitalize="words" />
        <Label>How do you use it?</Label>
        <ChoiceRow value={kind} onChange={setKind} options={[{ label: 'On a schedule', value: 'scheduled' }, { label: 'Only as needed', value: 'as_needed' }]} />
        <Label>Instructions from the label</Label><Field value={instructions} onChangeText={setInstructions} placeholder="Copy the label wording" multiline />
        {kind === 'scheduled' ? <>
          <Label>Daily times</Label>
          <View style={styles.timeEditor}>
            {times.map((time, index) => (
              <View key={`${time}-${index}`} style={styles.timeEditorRow}>
                <TimeField
                  value={time}
                  allowClear={false}
                  accessibilityLabel={`Select medicine time ${index + 1}`}
                  onChangeText={(next) => setTimes((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))}
                  style={styles.timePicker}
                />
                {times.length > 1 ? <Pressable accessibilityLabel={`Remove time ${time}`} hitSlop={8} onPress={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeTime}><Ionicons name="close" size={20} color={theme.muted} /></Pressable> : null}
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setTimes((current) => [...current, '09:00'])} style={styles.addTime}>
              <Ionicons name="add" size={18} color={theme.ink} />
              <Text style={[styles.addTimeText, { color: theme.ink }]}>Add another time</Text>
            </Pressable>
          </View>
          <Label>Days for this medicine</Label>
          <View style={styles.weekdayRow} accessibilityRole="list">
            {WEEKDAY_OPTIONS.map((day) => {
              const selected = weekdays.includes(day.value);
              return <Pressable key={day.label} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: selected }} onPress={() => toggleWeekday(day.value)} style={[styles.weekday, { borderColor: selected ? theme.ink : theme.border, backgroundColor: selected ? theme.ink : theme.backgroundRaised }]}><Text style={[styles.weekdayText, { color: selected ? theme.invertedInk : theme.muted }]}>{day.short}</Text></Pressable>;
            })}
          </View>
          <View style={styles.dayActions}>
            <Pressable onPress={() => setWeekdays([...ALL_WEEKDAYS])}><Text style={[styles.dayActionText, { color: theme.ink }]}>Every day</Text></Pressable>
            <Pressable onPress={() => setWeekdays([])}><Text style={[styles.dayActionText, { color: theme.muted }]}>Clear</Text></Pressable>
          </View>
          <Text style={[styles.dayHelp, { color: theme.muted }]}>Choose the exact weekdays from your own instructions. The app will not generate an alternate-day plan for you.</Text>
          <View style={styles.switchRow}><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>Local reminders</Text><Text style={[styles.body, { color: theme.muted }]}>One reminder at each time above.</Text></View><SmoothSwitch label="Medicine reminders" value={remindersEnabled} onValueChange={setRemindersEnabled} /></View>
        </> : <Text style={[styles.safety, { color: theme.muted, borderColor: theme.borderSoft }]}>As-needed medicines only receive a timestamp when you tap Taken. The app never calculates when another dose may be safe.</Text>}
        <Label>Private notes · optional</Label><Field value={notes} onChangeText={setNotes} placeholder="Anything you want to remember" multiline />
        {!name.trim() ? <InlineRequirement>Enter the medicine name to save it.</InlineRequirement> : kind === 'scheduled' && !weekdays.length ? <InlineRequirement>Select at least one day for this medicine.</InlineRequirement> : null}
        <Button title={busy ? 'Saving…' : 'Save medicine'} disabled={busy || !name.trim() || (kind === 'scheduled' && !weekdays.length)} onPress={() => void save()} />
      </Screen>
    );
  }

  if (mode === 'action' && actionMedication) {
    const statusLabel = actionStatus === 'taken' ? 'Taken' : actionStatus === 'skipped' ? 'Skipped' : 'Postponed';
    return (
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => setMode('list')} style={styles.back}><Ionicons name="arrow-back" size={19} color={theme.ink} /><Text style={[styles.backText, { color: theme.ink }]}>Medicines</Text></Pressable>
        <Heading title={statusLabel} subtitle={`${actionMedication.name}${actionTime ? ` · ${actionTime}` : ''}`} serif />
        {actionStatus === 'postponed' ? <><Label>Remind me at</Label><TimeField value={postponeTime} onChangeText={setPostponeTime} allowClear={false} placeholder="Select a time" /></> : null}
        <Label>Private note · optional</Label><Field value={eventNote} onChangeText={setEventNote} placeholder="A detail you want to keep" multiline />
        <Text style={[styles.safety, { color: theme.muted, borderColor: theme.borderSoft }]}>This records only what you chose. It does not judge the action or calculate medication safety.</Text>
        {actionStatus === 'postponed' && !postponeTime ? <InlineRequirement>Select a reminder time to continue.</InlineRequirement> : null}
        <Button title={busy ? 'Recording…' : `Record ${statusLabel.toLowerCase()}`} disabled={busy || (actionStatus === 'postponed' && !postponeTime)} onPress={() => void recordAction()} />
      </Screen>
    );
  }

  if (mode === 'history') {
    return (
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => setMode('list')} style={styles.back}><Ionicons name="arrow-back" size={19} color={theme.ink} /><Text style={[styles.backText, { color: theme.ink }]}>Medicines</Text></Pressable>
        <Heading title="Medication history" subtitle="A factual record of what you entered. No scores and no safety calculations." />
        {events.length ? <View>{events.map((event, index) => <View key={event.id}>{index ? <Divider /> : null}<View style={styles.historyRow}><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>{event.medication_name}</Text><Text style={[styles.body, { color: theme.muted }]}>{event.status === 'taken' ? 'Taken' : event.status === 'skipped' ? 'Skipped' : `Postponed${event.postponed_until ? ` to ${eventDate(event.postponed_until)}` : ''}`} · {eventDate(event.occurred_at)}</Text>{event.note ? <Text style={[styles.note, { color: theme.muted }]}>{event.note}</Text> : null}</View><Pressable accessibilityLabel={`Delete ${event.medication_name} history event`} onPress={() => void removeEvent(event)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={theme.danger} /></Pressable></View></View>)}</View> : <EmptyState icon="time-outline">No medication actions recorded yet.</EmptyState>}
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton />
      <Heading title="Medicines" subtitle="Remember what you took and when. Add, pause, or change medicines whenever you need; your label remains the source of instructions." />
      <View style={styles.topActions}><View style={styles.flex}><Button title="Add medicine" icon="add" onPress={openNew} /></View><Pressable accessibilityRole="button" onPress={() => setMode('history')} style={[styles.historyButton, { borderColor: theme.border }]}><Ionicons name="time-outline" size={19} color={theme.ink} /></Pressable></View>
      <Text style={[styles.safety, { color: theme.muted, borderColor: theme.borderSoft }]}>Fistula Tracker never recommends a dose, combines medicines, or tells you when another dose is safe.</Text>
      {medications.length ? medications.map((medication) => { const scheduledToday = medication.kind === 'scheduled' && includesDate(parseWeekdays(medication.weekdays), new Date()); return (
        <View key={medication.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.cardTop}><View style={styles.flex}><View style={styles.nameRow}><Text style={[styles.medName, { color: theme.ink }]}>{medication.name}</Text>{medication.status !== 'active' ? <Text style={[styles.status, { color: theme.subtle, borderColor: theme.border }]}>{medication.status === 'paused' ? 'Paused' : 'Archived'}</Text> : null}</View><Text style={[styles.body, { color: theme.muted }]}>{medication.kind === 'as_needed' ? 'As needed · timestamps only' : `${medication.times.map((time) => time.time).join(' · ')} · ${weekdaySummary(parseWeekdays(medication.weekdays))}`}</Text>{medication.instructions ? <Text style={[styles.instructions, { color: theme.muted }]}>{medication.instructions}</Text> : null}</View><Pressable accessibilityLabel={`Edit ${medication.name}`} onPress={() => void openEdit(medication.id)} hitSlop={10}><Ionicons name="create-outline" size={20} color={theme.muted} /></Pressable></View>
          {medication.status === 'active' ? (medication.kind === 'as_needed' ? <Button title="Taken" kind="secondary" onPress={() => openAction(medication, 'taken', null)} /> : scheduledToday ? medication.times.map((time) => { const recorded = recordedToday(medication, time.time); return <View key={time.id} style={[styles.occurrence, { borderTopColor: theme.borderSoft }]}><View style={styles.timeRow}><Text style={[styles.time, { color: theme.ink }]}>{time.time}</Text>{recorded ? <Text style={[styles.recorded, { color: theme.subtle }]}>Recorded today</Text> : null}</View>{recorded ? null : <View style={styles.actionRow}><Pressable onPress={() => openAction(medication, 'taken', time.time)} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallActionText, { color: theme.ink }]}>Taken</Text></Pressable><Pressable onPress={() => openAction(medication, 'skipped', time.time)} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallActionText, { color: theme.muted }]}>Skip</Text></Pressable><Pressable onPress={() => openAction(medication, 'postponed', time.time)} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallActionText, { color: theme.muted }]}>Postpone</Text></Pressable></View>}</View>; }) : <Text style={[styles.notToday, { color: theme.subtle, borderTopColor: theme.borderSoft }]}>Not scheduled today</Text>) : null}
          <View style={styles.manageRow}><Pressable disabled={busy} onPress={() => void setStatus(medication, medication.status === 'active' ? 'paused' : 'active')}><Text style={[styles.manageText, { color: theme.muted }]}>{medication.status === 'active' ? 'Pause' : 'Restore'}</Text></Pressable>{medication.status !== 'archived' ? <Pressable disabled={busy} onPress={() => void setStatus(medication, 'archived')}><Text style={[styles.manageText, { color: theme.muted }]}>Archive</Text></Pressable> : null}<Pressable disabled={busy} onPress={() => confirmDelete(medication)}><Text style={[styles.manageText, { color: theme.danger }]}>Delete</Text></Pressable></View>
        </View>
      ); }) : <EmptyState icon="medical-outline">No medicines saved. Add only what you want help remembering.</EmptyState>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  backText: { fontFamily: fonts.medium, fontSize: 16 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyButton: { width: 54, height: 54, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  safety: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  timeEditor: { gap: 9 },
  timeEditorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timePicker: { flex: 1 },
  removeTime: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  addTime: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7 },
  addTimeText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21 },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekday: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19 },
  dayActions: { flexDirection: 'row', gap: 20, minHeight: 35, alignItems: 'center' },
  dayActionText: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  dayHelp: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: -6 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 19, padding: 17, gap: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  medName: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  status: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, textTransform: 'uppercase', letterSpacing: 0.6 },
  instructions: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, marginTop: 5 },
  occurrence: { borderTopWidth: 1, paddingTop: 12, gap: 9 },
  time: { fontFamily: fonts.semibold, fontSize: 17 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  recorded: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  notToday: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, borderTopWidth: 1, paddingTop: 12 },
  actionRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  smallAction: { borderWidth: 1, borderRadius: 12, minHeight: 42, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  smallActionText: { fontFamily: fonts.medium, fontSize: 15 },
  manageRow: { flexDirection: 'row', gap: 18, paddingTop: 3 },
  manageText: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  note: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 24, marginTop: 4 },
});
