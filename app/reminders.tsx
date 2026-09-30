import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, ChoiceRow, Divider, EmptyState, Field, fonts, Heading, InlineRequirement, Label, Screen, SmoothSwitch, TimeField, useTheme } from '@/src/components/ui';
import { deleteRoutineEvent, deleteRoutineTask, getSetting, listMedications, listReminders, listRoutineEvents, listRoutineTasks, saveRoutineEvent, saveRoutineTask, setSetting, updateMedicationTimeNotification, updateReminder } from '@/src/lib/db';
import { isTime } from '@/src/lib/date';
import { cancelReminder, scheduleDailyReminder, scheduleMedicationReminder, schedulePostponedReminder, scheduleRoutineReminder } from '@/src/lib/notifications';
import { buildReminderPlan, notificationIdsForDeletion } from '@/src/lib/reminder-state';
import { dateAtTime, hasRecordedStatus, localISOTimestamp, scheduledTimestamp } from '@/src/lib/schedule';
import { parseWeekdays } from '@/src/lib/weekdays';
import type { Reminder, RoutineEvent, RoutineKind, RoutineTask } from '@/src/types';

type Mode = 'list' | 'form' | 'history' | 'action';

const kindOptions: { label: string; value: RoutineKind }[] = [
  { label: 'Sitz bath', value: 'sitz_bath' },
  { label: 'Dressing change', value: 'dressing_change' },
  { label: 'Wound photo', value: 'wound_photo' },
  { label: 'Water or fibre', value: 'water_fibre' },
  { label: 'Custom instruction', value: 'custom' },
];

const icons: Record<RoutineKind, keyof typeof Ionicons.glyphMap> = {
  sitz_bath: 'water-outline',
  dressing_change: 'bandage-outline',
  wound_photo: 'camera-outline',
  water_fibre: 'leaf-outline',
  custom: 'document-text-outline',
};

const routineKindTitles: Record<Exclude<RoutineKind, 'custom'>, string> = {
  sitz_bath: 'Sitz bath',
  dressing_change: 'Dressing change',
  wound_photo: 'Private wound photo',
  water_fibre: 'Water or fibre goal',
};

function eventDate(value: string) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function RoutineScreen() {
  const theme = useTheme();
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [checkIn, setCheckIn] = useState<Reminder | null>(null);
  const [wording, setWording] = useState<'discreet' | 'standard'>('standard');
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<RoutineTask | null>(null);
  const [kind, setKind] = useState<RoutineKind>('custom');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [time, setTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [actionTask, setActionTask] = useState<RoutineTask | null>(null);
  const [actionStatus, setActionStatus] = useState<'done' | 'skipped' | 'postponed'>('done');
  const [actionNote, setActionNote] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [savedTasks, savedEvents, legacy, savedWording] = await Promise.all([listRoutineTasks(), listRoutineEvents(), listReminders(), getSetting('notification_wording')]);
    setTasks(savedTasks);
    setEvents(savedEvents);
    setCheckIn(legacy.find((item) => item.kind === 'check_in') ?? null);
    setWording(savedWording === 'discreet' ? 'discreet' : 'standard');
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openNew() {
    setEditing(null);
    setKind('custom');
    setTitle('');
    setInstructions('');
    setTime('');
    setReminderEnabled(false);
    setMode('form');
  }

  function openEdit(task: RoutineTask) {
    setEditing(task);
    setKind(task.kind);
    setTitle(task.title);
    setInstructions(task.instructions);
    setTime(task.time ?? '');
    setReminderEnabled(Boolean(task.reminder_enabled));
    setMode('form');
  }

  async function saveTask() {
    const savedTitle = kind === 'custom' ? title.trim() : routineKindTitles[kind];
    if (!savedTitle || (reminderEnabled && !isTime(time))) return;
    setBusy(true);
    let notificationId: string | null = null;
    try {
      if (reminderEnabled) notificationId = await scheduleRoutineReminder(savedTitle, time);
      await saveRoutineTask({ kind, title: savedTitle, instructions, time: time || null, reminder_enabled: reminderEnabled, notification_id: notificationId, active: editing ? Boolean(editing.active) : true, default_key: editing?.default_key }, editing?.id);
      await Promise.allSettled([cancelReminder(editing?.notification_id ?? null)]);
      await load();
      setMode('list');
    } catch (reason) {
      await cancelReminder(notificationId);
      Alert.alert('Could not save task', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: RoutineTask, active: boolean) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, active: active ? 1 : 0 } : item));
    setBusy(true);
    try {
      let notificationId = task.notification_id;
      if (!active) {
        await cancelReminder(notificationId);
        notificationId = null;
      } else if (task.reminder_enabled && task.time) {
        notificationId = await scheduleRoutineReminder(task.title, task.time);
      }
      await saveRoutineTask({ ...task, reminder_enabled: Boolean(task.reminder_enabled), notification_id: notificationId, active }, task.id);
      await load();
    } catch (reason) {
      await load();
      Alert.alert('Could not update routine', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleCheckIn(enabled: boolean) {
    if (!checkIn) return;
    setCheckIn({ ...checkIn, enabled: enabled ? 1 : 0 });
    setBusy(true);
    try {
      await cancelReminder(checkIn.notification_id);
      const notificationId = enabled ? await scheduleDailyReminder('check_in', checkIn.time) : null;
      await updateReminder('check_in', enabled, checkIn.time, notificationId);
      await load();
    } catch (reason) {
      await load();
      Alert.alert('Could not update check-in reminder', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCheckInTime() {
    if (!checkIn || !isTime(checkIn.time)) {
      Alert.alert('Check the time', 'Use a 24-hour time such as 20:00.');
      return;
    }
    setBusy(true);
    try {
      await cancelReminder(checkIn.notification_id);
      const notificationId = checkIn.enabled ? await scheduleDailyReminder('check_in', checkIn.time) : null;
      await updateReminder('check_in', Boolean(checkIn.enabled), checkIn.time, notificationId);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function openAction(task: RoutineTask, status: 'done' | 'skipped' | 'postponed') {
    setActionTask(task);
    setActionStatus(status);
    setActionNote('');
    setPostponeTime(task.time ?? '');
    setMode('action');
  }

  async function recordAction() {
    if (!actionTask) return;
    let postponedUntil: string | null = null;
    let notificationId: string | null = null;
    if (actionStatus === 'postponed') {
      const date = dateAtTime(postponeTime);
      if (!date) {
        Alert.alert('Choose a time', 'Use a 24-hour time such as 16:30.');
        return;
      }
      postponedUntil = localISOTimestamp(date);
      setBusy(true);
      try {
        notificationId = await schedulePostponedReminder(actionTask.title, date);
      } catch (reason) {
        setBusy(false);
        Alert.alert('Could not postpone reminder', reason instanceof Error ? reason.message : 'Please try again.');
        return;
      }
    }
    setBusy(true);
    try {
      await saveRoutineEvent({ task_id: actionTask.id, task_title: actionTask.title, status: actionStatus, occurred_at: localISOTimestamp(), scheduled_for: actionTask.time ? scheduledTimestamp(actionTask.time) : null, postponed_until: postponedUntil, notification_id: notificationId, note: actionNote });
      await load();
      setMode('list');
    } catch (reason) {
      await cancelReminder(notificationId);
      Alert.alert('Could not record this', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function changeWording(value: 'discreet' | 'standard') {
    setBusy(true);
    try {
      await setSetting('notification_wording', value);
      setWording(value);

      if (checkIn) {
        await cancelReminder(checkIn.notification_id);
        const notificationId = checkIn.enabled ? await scheduleDailyReminder('check_in', checkIn.time) : null;
        await updateReminder('check_in', Boolean(checkIn.enabled), checkIn.time, notificationId);
      }

      for (const task of tasks) {
        const plan = buildReminderPlan(task.notification_id, Boolean(task.active), Boolean(task.reminder_enabled), task.time);
        await cancelReminder(plan.cancelNotificationId);
        const notificationId = plan.shouldSchedule && task.time
          ? await scheduleRoutineReminder(task.title, task.time)
          : null;
        await saveRoutineTask({ ...task, reminder_enabled: Boolean(task.reminder_enabled), active: Boolean(task.active), notification_id: notificationId }, task.id);
      }

      const medications = await listMedications(true);
      for (const medication of medications) {
        for (const medicationTime of medication.times) {
          const plan = buildReminderPlan(medicationTime.notification_id, medication.status === 'active', Boolean(medicationTime.reminder_enabled), medicationTime.time);
          await cancelReminder(plan.cancelNotificationId);
          const notificationId = plan.shouldSchedule
            ? await scheduleMedicationReminder(medication.name, medicationTime.time, parseWeekdays(medication.weekdays))
            : null;
          await updateMedicationTimeNotification(medicationTime.id, Boolean(medicationTime.reminder_enabled), notificationId);
        }
      }
      await load();
    } catch (reason) {
      await load();
      Alert.alert('Could not update notification wording', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(task: RoutineTask) {
    Alert.alert('Delete this routine task?', 'You can keep its factual history or remove that history too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete, keep history', onPress: () => void removeTask(task, false) },
      { text: 'Delete with history', style: 'destructive', onPress: () => void removeTask(task, true) },
    ]);
  }

  async function removeTask(task: RoutineTask, deleteHistory: boolean) {
    await cancelReminder(task.notification_id);
    await Promise.all(notificationIdsForDeletion(events.filter((event) => event.task_id === task.id)).map(cancelReminder));
    await deleteRoutineTask(task.id, deleteHistory);
    await load();
  }

  async function removeEvent(event: RoutineEvent) {
    await cancelReminder(event.notification_id);
    await deleteRoutineEvent(event.id);
    await load();
  }

  function recordedToday(task: RoutineTask) {
    const ownEvents = events.filter((event) => event.task_id === task.id);
    return hasRecordedStatus(ownEvents, task.time ? scheduledTimestamp(task.time) : null);
  }

  if (mode === 'form') { const requirement = kind === 'custom' && !title.trim() ? 'Enter a task name to save it.' : reminderEnabled && !time ? 'Select a time for the enabled reminder.' : ''; return <Screen><BackButton label="Routine" /><Heading title={editing ? 'Edit routine task' : 'Add routine task'} subtitle="Use your own care plan or discharge instructions. The app will not prescribe a schedule." /><Label>Type</Label><ChoiceRow value={kind} onChange={(value) => { setKind(value); if (value !== 'custom') setTitle(routineKindTitles[value]); else if (kind !== 'custom') setTitle(''); }} options={kindOptions} />{kind === 'custom' ? <><Label>Task name</Label><Field value={title} onChangeText={setTitle} placeholder="Your wording" /></> : <View style={[styles.fixedTask, { backgroundColor: theme.backgroundRaised, borderColor: theme.border }]}><Text style={[styles.rowTitle, { color: theme.ink }]}>{routineKindTitles[kind]}</Text><Text style={[styles.body, { color: theme.muted }]}>The name follows the selected type.</Text></View>}<Label>Your instruction · optional</Label><Field value={instructions} onChangeText={setInstructions} placeholder="Copy your discharge-sheet wording" multiline /><Label>Daily time · optional</Label><TimeField value={time} onChangeText={setTime} placeholder="Select a time" /><View style={styles.switchRow}><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>Local reminder</Text><Text style={[styles.body, { color: theme.muted }]}>At the time you selected above.</Text></View><SmoothSwitch label="Routine reminder" value={reminderEnabled} onValueChange={setReminderEnabled} /></View>{requirement ? <InlineRequirement>{requirement}</InlineRequirement> : null}<Button title={busy ? 'Saving…' : 'Save task'} disabled={busy || Boolean(requirement)} onPress={() => void saveTask()} /></Screen>; }

  if (mode === 'action' && actionTask) return <Screen><Pressable onPress={() => setMode('list')} style={styles.back}><Ionicons name="arrow-back" size={19} color={theme.ink} /><Text style={[styles.backText, { color: theme.ink }]}>Routine</Text></Pressable><Heading title={actionStatus === 'done' ? 'Done' : actionStatus === 'skipped' ? 'Skipped' : 'Postponed'} subtitle={actionTask.title} serif />{actionStatus === 'postponed' ? <><Label>Remind me at</Label><TimeField value={postponeTime} onChangeText={setPostponeTime} allowClear={false} placeholder="Select a time" /></> : null}<Label>Private note · optional</Label><Field value={actionNote} onChangeText={setActionNote} placeholder="A detail you want to keep" multiline /><Text style={[styles.notice, { color: theme.muted, borderColor: theme.borderSoft }]}>This records your choice without scoring or interpreting it.</Text>{actionStatus === 'postponed' && !postponeTime ? <InlineRequirement>Select a reminder time to continue.</InlineRequirement> : null}<Button title={busy ? 'Recording…' : 'Record'} disabled={busy || (actionStatus === 'postponed' && !postponeTime)} onPress={() => void recordAction()} /></Screen>;

  if (mode === 'history') return <Screen><Pressable onPress={() => setMode('list')} style={styles.back}><Ionicons name="arrow-back" size={19} color={theme.ink} /><Text style={[styles.backText, { color: theme.ink }]}>Routine</Text></Pressable><Heading title="Routine history" subtitle="What you recorded, in order. No streaks or missed-task judgments." />{events.length ? events.map((event, index) => <View key={event.id}>{index ? <Divider /> : null}<View style={styles.historyRow}><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>{event.task_title}</Text><Text style={[styles.body, { color: theme.muted }]}>{event.status === 'done' ? 'Done' : event.status === 'skipped' ? 'Skipped' : `Postponed${event.postponed_until ? ` to ${eventDate(event.postponed_until)}` : ''}`} · {eventDate(event.occurred_at)}</Text>{event.note ? <Text style={[styles.note, { color: theme.muted }]}>{event.note}</Text> : null}</View><Pressable accessibilityLabel={`Delete ${event.task_title} history event`} onPress={() => void removeEvent(event)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={theme.danger} /></Pressable></View></View>) : <EmptyState icon="time-outline">No routine actions recorded yet.</EmptyState>}</Screen>;

  const activeTasks = tasks.filter((task) => task.active);
  return <Screen><BackButton /><Heading title="Daily routine" subtitle="A quiet plan made from your own instructions. You can change any task, time, or reminder later." /><Pressable accessibilityRole="button" onPress={() => router.push('/medications')} style={[styles.medLink, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="medical-outline" size={23} color={theme.muted} /><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>Medicines</Text><Text style={[styles.body, { color: theme.muted }]}>Schedules, reminders and timestamped history</Text></View><Ionicons name="chevron-forward" size={18} color={theme.subtle} /></Pressable><Text style={[styles.notice, { color: theme.muted, borderColor: theme.borderSoft }]}>Everything here is organizational. Enter the instructions and timing you chose or were given.</Text>
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: theme.ink }]}>Today</Text><Pressable onPress={() => setMode('history')}><Text style={[styles.textLink, { color: theme.muted }]}>View history</Text></Pressable></View>
    {activeTasks.length ? activeTasks.map((task) => { const recorded = recordedToday(task); return <View key={task.id} style={[styles.taskCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><View style={styles.taskTop}><Ionicons name={recorded ? 'checkmark-circle-outline' : icons[task.kind]} size={21} color={theme.muted} /><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>{task.title}</Text><Text style={[styles.body, { color: theme.muted }]}>{recorded ? 'Recorded today' : task.time ? `${task.time}${task.instructions ? ` · ${task.instructions}` : ''}` : task.instructions || 'No time set'}</Text></View><Pressable onPress={() => openEdit(task)} hitSlop={10}><Ionicons name="create-outline" size={19} color={theme.muted} /></Pressable></View>{recorded ? null : <View style={styles.actionRow}><Pressable onPress={() => openAction(task, 'done')} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallText, { color: theme.ink }]}>Done</Text></Pressable><Pressable onPress={() => openAction(task, 'skipped')} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallText, { color: theme.muted }]}>Skip</Text></Pressable><Pressable onPress={() => openAction(task, 'postponed')} style={[styles.smallAction, { borderColor: theme.border }]}><Text style={[styles.smallText, { color: theme.muted }]}>Postpone</Text></Pressable></View>}</View>; }) : <EmptyState icon="list-outline">Choose routine tasks below when they are useful.</EmptyState>}
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: theme.ink }]}>Choose your routine</Text><Pressable onPress={openNew}><Text style={[styles.textLink, { color: theme.ink }]}>+ Custom task</Text></Pressable></View>
    {tasks.map((task, index) => <View key={task.id}>{index ? <Divider /> : null}<View style={styles.chooseRow}><Ionicons name={icons[task.kind]} size={20} color={theme.subtle} /><Pressable style={styles.flex} onPress={() => openEdit(task)}><Text style={[styles.rowTitle, { color: theme.ink }]}>{task.title}</Text><Text style={[styles.body, { color: theme.muted }]}>{task.default_key ? 'Built-in option · editable' : 'Your custom instruction'}</Text></Pressable><SmoothSwitch label={task.title} disabled={busy} value={Boolean(task.active)} onValueChange={(value) => void toggleTask(task, value)} /></View>{!task.default_key ? <Pressable onPress={() => confirmDelete(task)} style={styles.deleteTask}><Text style={[styles.textLink, { color: theme.danger }]}>Delete task</Text></Pressable> : null}</View>)}
    <Text style={[styles.sectionTitle, { color: theme.ink }]}>Check-in reminder</Text>{checkIn ? <><View style={styles.switchRow}><View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.ink }]}>Daily check-in</Text><TimeField value={checkIn.time} onChangeText={(value) => setCheckIn({ ...checkIn, time: value })} placeholder="Select a time" allowClear={false} style={styles.timeField} /></View><View style={styles.checkActions}><SmoothSwitch label="Daily check-in reminder" value={Boolean(checkIn.enabled)} onValueChange={(value) => void toggleCheckIn(value)} /><Pressable onPress={() => void saveCheckInTime()}><Text style={[styles.textLink, { color: theme.ink }]}>Save time</Text></Pressable></View></View><Text style={[styles.body, { color: theme.muted }]}>Change the time or turn this off whenever you need. Medicine and scheduled routine reminders remain separate.</Text></> : null}
    <Text style={[styles.sectionTitle, { color: theme.ink }]}>Lock-screen wording</Text><ChoiceRow value={wording} onChange={(value) => { if (!busy) void changeWording(value); }} options={[{ label: 'Keep it discreet', value: 'discreet' }, { label: 'Use task names', value: 'standard' }]} />
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  backText: { fontFamily: fonts.medium, fontSize: 16 },
  medLink: { borderWidth: 1, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  notice: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26, marginTop: 12 },
  textLink: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  taskCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 13 },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  smallAction: { borderWidth: 1, borderRadius: 12, minHeight: 42, paddingHorizontal: 15, justifyContent: 'center' },
  smallText: { fontFamily: fonts.medium, fontSize: 15 },
  chooseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10 },
  deleteTask: { alignSelf: 'flex-end', paddingBottom: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70 },
  checkActions: { alignItems: 'flex-end', gap: 5 },
  timeField: { width: 130, marginTop: 7 },
  fixedTask: { borderWidth: 1, borderRadius: 15, padding: 15, gap: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  note: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 24, marginTop: 4 },
});
