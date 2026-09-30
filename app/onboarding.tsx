import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { AnimatedStage, Button, ChoiceRow, DateField, EmphasisText, Field, fonts, InlineRequirement, ProgressIndicator, Screen, SelectionFade, TimeField, useTheme } from '@/src/components/ui';
import { useApp } from '@/src/context/app-context';
import { displayDateToISO } from '@/src/lib/date';
import { listRoutineTasks, saveMedication, saveProfile, saveRecoveryItemIfMissing, saveRoutineTask, setDefaultRoutineSelections, setSetting, updateReminder } from '@/src/lib/db';
import { getNotificationPermissionStatus, requestNotificationPermission, scheduleDailyReminder, scheduleMedicationReminder, scheduleRoutineReminder } from '@/src/lib/notifications';
import { ALL_WEEKDAYS, serializeWeekdays, weekdaySummary, WEEKDAY_OPTIONS } from '@/src/lib/weekdays';

type StepId = 'name' | 'situation' | 'origin' | 'history' | 'reflection' | 'procedure' | 'date' | 'isolation' | 'impact' | 'routine' | 'routine_times' | 'medicine' | 'checkin_reminder' | 'notification_permission' | 'appearance' | 'promise' | 'purpose' | 'honest' | 'finish';
type Situation = 'noticing' | 'diagnosed' | 'waiting' | 'recent_procedure' | 'recovering' | 'unsure';
type Recurrence = 'first_time' | 'returned' | 'unsure';
type ProcedureCount = 'none' | 'once' | 'twice' | 'three_plus' | 'prefer_not';
type NotificationWording = 'discreet' | 'standard' | 'later';
type Impact = 'pain' | 'sitting' | 'bowel_movements' | 'sleep' | 'work_studies' | 'stress' | 'something_else';
type RoutineTaskChoice = 'sitz_bath' | 'dressing_change' | 'wound_photo' | 'water_fibre';
type RoutineChoice = RoutineTaskChoice | 'medication';
type AppearanceChoice = 'light' | 'dark';
type CheckInReminderChoice = 'evening' | 'morning' | 'custom' | 'none';
type OnboardingMedicine = { id: string; name: string; time: string; weekdays: number[] };

const fullOnboardingSequence: StepId[] = ['name', 'situation', 'origin', 'history', 'reflection', 'procedure', 'date', 'isolation', 'impact', 'routine', 'routine_times', 'medicine', 'checkin_reminder', 'notification_permission', 'appearance', 'promise', 'purpose', 'honest', 'finish'];

const situationOptions: { label: string; value: Situation }[] = [
  { label: 'I’m noticing signs', value: 'noticing' },
  { label: 'I was just diagnosed', value: 'diagnosed' },
  { label: 'I’m waiting for treatment', value: 'waiting' },
  { label: 'I recently had a procedure', value: 'recent_procedure' },
  { label: 'I’m recovering', value: 'recovering' },
  { label: 'I’m not sure', value: 'unsure' },
];

const impactOptions: { label: string; value: Impact }[] = [
  { label: 'Pain', value: 'pain' },
  { label: 'Sitting or movement', value: 'sitting' },
  { label: 'Bowel movements', value: 'bowel_movements' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Work or studies', value: 'work_studies' },
  { label: 'Stress or low mood', value: 'stress' },
  { label: 'Something else', value: 'something_else' },
];

const routineOptions: { title: string; detail: string; value: RoutineChoice; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Sitz bath', detail: 'Only on the schedule you choose or were given', value: 'sitz_bath', icon: 'water-outline' },
  { title: 'Dressing change', detail: 'Your own care instructions', value: 'dressing_change', icon: 'bandage-outline' },
  { title: 'Private wound photo', detail: 'Only when you choose to record one', value: 'wound_photo', icon: 'camera-outline' },
  { title: 'Water or fibre goal', detail: 'A target you chose or were given', value: 'water_fibre', icon: 'leaf-outline' },
  { title: 'Medication', detail: 'Medicine names, days and reminder times', value: 'medication', icon: 'medical-outline' },
];

function stageForSituation(situation: Situation) {
  const stages: Record<Situation, string> = {
    noticing: 'Noticing signs',
    diagnosed: 'Just diagnosed',
    waiting: 'Waiting for treatment',
    recent_procedure: 'Recently had surgery',
    recovering: 'Recovering',
    unsure: 'Not sure',
  };
  return stages[situation];
}

function reflectionFor(count: ProcedureCount) {
  if (count === 'none') return {
    before: 'You may be carrying a lot of ',
    emphasis: 'uncertainty.',
    support: 'This app will not diagnose or tell you what treatment to choose. It can simply help you keep a private record of what you experience.',
  };
  if (count === 'once') return {
    before: 'One procedure can still take up a huge part of your ',
    emphasis: 'life.',
    support: 'Pain and recovery do not become insignificant because someone else calls the procedure minor.',
  };
  if (count === 'twice') return {
    before: 'I have been through two surgeries ',
    emphasis: 'too.',
    support: 'That does not make our experiences identical. But you are not the only person who has had to begin again.',
  };
  if (count === 'three_plus') return {
    before: 'Going through this again and again can be ',
    emphasis: 'exhausting.',
    support: 'You should not have to minimize that here.',
  };
  return {
    before: 'You never have to share more than feels ',
    emphasis: 'right.',
    support: 'This space can still be useful without every detail.',
  };
}

function honestSupport(situation: Situation, recurrence: Recurrence) {
  if (recurrence === 'returned') return 'Having it return can bring old fear back with it. That does not erase everything you have already survived.';
  if (situation === 'waiting') return 'Waiting without clear answers can be difficult in its own way.';
  if (situation === 'recent_procedure' || situation === 'recovering') return 'Recovery can be slow, painful, and mentally exhausting.';
  if (recurrence === 'first_time') return 'You do not need to understand or solve everything today.';
  return 'Not knowing can be its own kind of stress. You can begin without having all the answers.';
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const replaying = from === 'settings';
  const { displayName, finishOnboarding, refresh, setDarkModeEnabled, setDisplayName } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(displayName);
  const [situation, setSituation] = useState<Situation | ''>('');
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('');
  const [procedureCount, setProcedureCount] = useState<ProcedureCount | ''>('');
  const [procedureType, setProcedureType] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [notificationWording, setNotificationWording] = useState<NotificationWording | ''>('');
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [routineChoices, setRoutineChoices] = useState<RoutineChoice[]>([]);
  const [routineTimes, setRoutineTimes] = useState<Partial<Record<RoutineTaskChoice, string>>>({});
  const [medicines, setMedicines] = useState<OnboardingMedicine[]>([]);
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [medicineName, setMedicineName] = useState('');
  const [medicineTime, setMedicineTime] = useState('');
  const [medicineWeekdays, setMedicineWeekdays] = useState<number[]>([...ALL_WEEKDAYS]);
  const [checkInReminderChoice, setCheckInReminderChoice] = useState<CheckInReminderChoice | ''>('');
  const [checkInTime, setCheckInTime] = useState('');
  const [notificationPermissionAllowed, setNotificationPermissionAllowed] = useState<boolean | null>(null);
  const [notificationPermissionCanAskAgain, setNotificationPermissionCanAskAgain] = useState<boolean | null>(null);
  const [requestingNotificationPermission, setRequestingNotificationPermission] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceChoice>('light');
  const [wish, setWish] = useState('');
  const [saving, setSaving] = useState(false);

  const hasKnownProcedureHistory = procedureCount === 'once' || procedureCount === 'twice' || procedureCount === 'three_plus';
  const wantsRoutineReminders = routineChoices.some((choice) => choice !== 'medication' && Boolean(routineTimes[choice]));
  const wantsMedicationReminders = routineChoices.includes('medication') && medicines.length > 0;
  const wantsCheckInReminder = checkInReminderChoice !== '' && checkInReminderChoice !== 'none';
  const wantsNotifications = wantsRoutineReminders || wantsMedicationReminders || wantsCheckInReminder;
  const steps = useMemo<StepId[]>(() => {
    if (replaying) return ['origin', 'isolation', 'promise', 'purpose', 'honest', 'finish'];
    const sequence: StepId[] = ['name', 'situation', 'origin', 'history', 'reflection'];
    if (hasKnownProcedureHistory) sequence.push('procedure', 'date');
    sequence.push('isolation', 'impact', 'routine');
    if (routineChoices.some((choice) => choice !== 'medication')) sequence.push('routine_times');
    if (routineChoices.includes('medication')) sequence.push('medicine');
    sequence.push('checkin_reminder');
    if (wantsNotifications) sequence.push('notification_permission');
    return [...sequence, 'appearance', 'promise', 'purpose', 'honest', 'finish'];
  }, [hasKnownProcedureHistory, replaying, routineChoices, wantsNotifications]);

  const step = steps[stepIndex] ?? steps[steps.length - 1];
  const progressPosition = replaying ? stepIndex + 1 : fullOnboardingSequence.indexOf(step) + 1;
  const progressTotal = replaying ? steps.length : fullOnboardingSequence.length;
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const reflection = reflectionFor(procedureCount || 'prefer_not');
  const medicineDraftStarted = Boolean(medicineName.trim() || medicineTime || editingMedicineId);
  const requirement = step === 'name' && !name.trim()
    ? 'Enter a first name or nickname to continue.'
    : step === 'situation' && !situation
      ? 'Choose where you are right now to continue.'
      : step === 'origin' && !replaying && !recurrence
        ? 'Choose the answer that feels closest to continue.'
        : step === 'history' && !procedureCount
          ? 'Choose an answer, including “Prefer not to say,” to continue.'
          : step === 'isolation' && !replaying && !notificationWording
            ? 'Choose how private notifications should be to continue.'
            : step === 'medicine' && !medicines.length && !medicineDraftStarted
              ? 'Add a medicine, or choose “I’ll add medicines later.”'
              : step === 'medicine' && medicineDraftStarted && !medicineName.trim()
                ? 'Enter the medicine name from its label.'
                : step === 'medicine' && Boolean(medicineName.trim()) && !medicineTime
                  ? 'Select when you want this medicine reminder.'
                  : step === 'medicine' && Boolean(medicineName.trim()) && !medicineWeekdays.length
                    ? 'Select at least one reminder day.'
                    : step === 'checkin_reminder' && !checkInReminderChoice
                      ? 'Choose a daily check-in reminder preference to continue.'
                      : step === 'checkin_reminder' && checkInReminderChoice !== 'none' && !checkInTime
                        ? 'Choose a time for the daily check-in reminder.'
          : '';

  useEffect(() => {
    if (step !== 'notification_permission') return;
    let active = true;

    async function refreshPermissionStatus() {
      try {
        const permission = await getNotificationPermissionStatus();
        if (!active) return;
        setNotificationPermissionAllowed(permission.granted);
        setNotificationPermissionCanAskAgain(permission.canAskAgain);
      } catch {
        if (!active) return;
        setNotificationPermissionAllowed(false);
        setNotificationPermissionCanAskAgain(false);
      }
    }

    void refreshPermissionStatus();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissionStatus();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [step]);

  function next() {
    if (requirement) return;
    if (step === 'medicine' && medicineName.trim()) saveMedicineDraft();
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function back() {
    if (stepIndex === 0) {
      if (replaying) router.back();
      return;
    }
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function toggleImpact(value: Impact) {
    setImpacts((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleRoutine(value: RoutineChoice) {
    setRoutineChoices((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleMedicineWeekday(day: number) {
    setMedicineWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((left, right) => left - right));
  }

  function resetMedicineDraft() {
    setEditingMedicineId(null);
    setMedicineName('');
    setMedicineTime('');
    setMedicineWeekdays([...ALL_WEEKDAYS]);
  }

  function saveMedicineDraft() {
    if (!medicineName.trim() || !medicineTime || !medicineWeekdays.length) return;
    const medicine: OnboardingMedicine = {
      id: editingMedicineId ?? `${Date.now()}-${medicines.length}`,
      name: medicineName.trim(),
      time: medicineTime,
      weekdays: [...medicineWeekdays],
    };
    setMedicines((current) => editingMedicineId
      ? current.map((item) => item.id === editingMedicineId ? medicine : item)
      : [...current, medicine]);
    resetMedicineDraft();
  }

  function editMedicine(medicine: OnboardingMedicine) {
    setEditingMedicineId(medicine.id);
    setMedicineName(medicine.name);
    setMedicineTime(medicine.time);
    setMedicineWeekdays([...medicine.weekdays]);
  }

  function removeMedicine(id: string) {
    setMedicines((current) => current.filter((medicine) => medicine.id !== id));
    if (editingMedicineId === id) resetMedicineDraft();
  }

  function chooseCheckInReminder(choice: CheckInReminderChoice) {
    setCheckInReminderChoice(choice);
    if (choice === 'evening') setCheckInTime('20:00');
    if (choice === 'morning') setCheckInTime('08:00');
    if (choice === 'custom' && checkInReminderChoice === 'none') setCheckInTime('');
    if (choice === 'none') setCheckInTime('');
  }

  function chooseAppearance(value: AppearanceChoice) {
    setAppearance(value);
    void setDarkModeEnabled(value === 'dark');
  }

  async function enableNotifications() {
    if (notificationPermissionAllowed === true) return;
    setRequestingNotificationPermission(true);
    try {
      if (notificationPermissionCanAskAgain === false) {
        await Linking.openSettings();
        return;
      }
      await requestNotificationPermission();
      const permission = await getNotificationPermissionStatus();
      setNotificationPermissionAllowed(permission.granted);
      setNotificationPermissionCanAskAgain(permission.canAskAgain);
    } catch {
      setNotificationPermissionAllowed(false);
    } finally {
      setRequestingNotificationPermission(false);
    }
  }

  function continueWithoutNotifications() {
    next();
  }

  async function finish() {
    if (replaying) {
      router.back();
      return;
    }
    if (!situation || !recurrence || !procedureCount || !notificationWording) return;
    setSaving(true);
    try {
      const hadSurgery = hasKnownProcedureHistory || situation === 'recent_procedure' ? 1 : 0;
      await setDisplayName(name);
      await saveProfile({
        had_surgery: hadSurgery,
        surgery_date: hadSurgery && surgeryDate ? displayDateToISO(surgeryDate) : null,
        procedure_type: hadSurgery && procedureType.trim() ? procedureType.trim() : null,
        recovery_stage: stageForSituation(situation),
      });
      await Promise.all([
        setSetting('onboarding_recurrence', recurrence),
        setSetting('onboarding_procedure_count', procedureCount),
        setSetting('onboarding_impacts', JSON.stringify(impacts)),
        setSetting('notification_wording', notificationWording === 'discreet' ? 'discreet' : 'standard'),
        setDarkModeEnabled(appearance === 'dark'),
      ]);
      const selectedRoutineTasks = routineChoices.filter((choice): choice is RoutineTaskChoice => choice !== 'medication');
      await setDefaultRoutineSelections(selectedRoutineTasks);

      async function scheduleIfAllowed(schedule: () => Promise<string>) {
        if (notificationPermissionAllowed !== true) return null;
        try {
          return await schedule();
        } catch {
          // Keep the chosen time, but leave this reminder disabled for later.
          return null;
        }
      }

      const savedTasks = await listRoutineTasks();
      for (const choice of selectedRoutineTasks) {
        const task = savedTasks.find((item) => item.default_key === choice);
        if (!task) continue;
        const time = routineTimes[choice] ?? '';
        const notificationId = time ? await scheduleIfAllowed(() => scheduleRoutineReminder(task.title, time, false)) : null;
        await saveRoutineTask({ ...task, time: time || null, reminder_enabled: Boolean(notificationId), notification_id: notificationId, active: true }, task.id);
      }
      for (const medicine of routineChoices.includes('medication') ? medicines : []) {
        const notificationId = await scheduleIfAllowed(() => scheduleMedicationReminder(medicine.name, medicine.time, medicine.weekdays, false));
        await saveMedication({ name: medicine.name, instructions: '', kind: 'scheduled', notes: '', weekdays: serializeWeekdays(medicine.weekdays), status: 'active' }, [{ time: medicine.time, reminder_enabled: Boolean(notificationId), notification_id: notificationId }]);
      }
      const savedCheckInTime = checkInTime || '20:00';
      const checkInNotificationId = wantsCheckInReminder ? await scheduleIfAllowed(() => scheduleDailyReminder('check_in', savedCheckInTime, false)) : null;
      await updateReminder('check_in', Boolean(checkInNotificationId), savedCheckInTime, checkInNotificationId);
      await saveRecoveryItemIfMissing(wish);
      await finishOnboarding();
      await refresh();
      router.replace('/(tabs)');
    } catch (reason) {
      Alert.alert('Could not save', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll={step === 'medicine'}>
      <View style={styles.shell}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={back} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: theme.muted }]}>{stepIndex ? 'Back' : replaying ? 'Close' : ''}</Text>
            </Pressable>
            <Text style={[styles.count, { color: theme.subtle }]}>{progressPosition} / {progressTotal}</Text>
          </View>
          <ProgressIndicator current={progressPosition} total={progressTotal} />
        </View>

        <AnimatedStage stageKey={step} style={[styles.beat, (step === 'impact' || step === 'routine' || step === 'routine_times' || step === 'medicine' || step === 'checkin_reminder' || step === 'notification_permission' || step === 'promise') && styles.compactBeat]}>
          {step === 'name' ? (
            <>
              <Text style={[styles.kicker, { color: theme.muted }]}>Hi, I’m Sid.</Text>
              <EmphasisText before="What should I " emphasis="call you?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>A first name or nickname is enough. It stays on this device.</Text>
              <Field value={name} onChangeText={setName} placeholder="Your name" autoFocus autoCapitalize="words" returnKeyType="next" onSubmitEditing={next} />
            </>
          ) : null}

          {step === 'situation' ? (
            <>
              <Text style={[styles.kicker, { color: theme.muted }]}>Thanks, {firstName}.</Text>
              <EmphasisText before="Where are you in all this " emphasis="right now?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Choose whatever feels closest. You can change it later.</Text>
              <ChoiceRow value={situation} onChange={setSituation} options={situationOptions} />
            </>
          ) : null}

          {step === 'origin' ? (
            <>
              <Text style={[styles.kicker, { color: theme.muted }]}>My story started young.</Text>
              <EmphasisText before="I was in eighth grade when I went through " emphasis="Ksharsutra." style={styles.editorial} />
              <Text style={[styles.support, { color: theme.muted }]}>It was done without anesthesia, and it became the most traumatic thing I had been through. Five years later, it returned while I was in college. I chose laser surgery because I could not face the pain of Ksharsutra again.</Text>
              {!replaying ? (
                <View style={styles.askBlock}>
                  <Text style={[styles.ask, { color: theme.ink }]}>Is this your first time dealing with it?</Text>
                  <ChoiceRow value={recurrence} onChange={setRecurrence} options={[
                    { label: 'Yes, the first time', value: 'first_time' },
                    { label: 'No, it came back', value: 'returned' },
                    { label: 'I’m not sure', value: 'unsure' },
                  ]} />
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'history' ? (
            <>
              <Text style={[styles.storyNote, { color: theme.muted }]}>
                {recurrence === 'returned' ? `Mine came back too, ${firstName}. Recurrence can bring old fear back with it.` : recurrence === 'first_time' ? 'The first time can feel especially uncertain. You do not need to understand everything today.' : 'Not knowing can be its own kind of stress. You can begin without all the answers.'}
              </Text>
              <EmphasisText before="How many procedures or " emphasis="surgeries" after=" have you had?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Count only what feels like a procedure to you.</Text>
              <ChoiceRow value={procedureCount} onChange={setProcedureCount} options={[
                { label: 'Not yet', value: 'none' },
                { label: 'Once', value: 'once' },
                { label: 'Twice', value: 'twice' },
                { label: 'Three or more', value: 'three_plus' },
                { label: 'Prefer not to say', value: 'prefer_not' },
              ]} />
            </>
          ) : null}

          {step === 'reflection' ? (
            <>
              <EmphasisText before={reflection.before} emphasis={reflection.emphasis} style={styles.editorial} />
              <Text style={[styles.supportLarge, { color: theme.muted }]}>{reflection.support}</Text>
            </>
          ) : null}

          {step === 'procedure' ? (
            <>
              <Text style={[styles.storyNote, { color: theme.muted }]}>Five years later, it came back while I was in college. I chose laser surgery because I could not face the pain of Ksharsutra again.</Text>
              <EmphasisText before="Do you know what procedure you " emphasis="had?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Medical terminology is not required here.</Text>
              <Field value={procedureType} onChangeText={setProcedureType} placeholder="Only if you know it" />
              <Pressable accessibilityRole="button" onPress={() => { setProcedureType(''); next(); }} hitSlop={10}>
                <Text style={[styles.textAction, { color: theme.muted }]}>I’m not sure — skip this</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'date' ? (
            <>
              <EmphasisText before="When was your most recent " emphasis="procedure?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>An approximate memory is okay. Leave it blank if you are not sure.</Text>
              <DateField value={surgeryDate} onChangeText={setSurgeryDate} accessibilityLabel="Select most recent procedure date" />
              <Pressable accessibilityRole="button" onPress={() => { setSurgeryDate(''); next(); }} hitSlop={10}>
                <Text style={[styles.textAction, { color: theme.muted }]}>I’m not sure — skip this</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'isolation' ? (
            <>
              <EmphasisText before="Almost nobody knew what I was " emphasis="going through." style={styles.editorial} />
              <Text style={[styles.supportLarge, { color: theme.muted }]}>None of my friends knew. For a long time, I simply dealt with it alone.</Text>
              {!replaying ? (
                <View style={styles.askBlock}>
                  <Text style={[styles.ask, { color: theme.ink }]}>How private should notifications be?</Text>
                  <ChoiceRow value={notificationWording} onChange={setNotificationWording} options={[
                    { label: 'Keep them discreet', value: 'discreet' },
                    { label: 'Use recovery wording', value: 'standard' },
                    { label: 'I’ll decide later', value: 'later' },
                  ]} />
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'impact' ? (
            <>
              <EmphasisText before="The pain was real—even when people did not " emphasis="understand it." style={styles.editorial} />
              <Text style={[styles.support, { color: theme.muted }]}>It can affect sitting, studying, working, sleeping, and your state of mind.</Text>
              <Text style={[styles.ask, { color: theme.ink }]}>What is affecting you most right now?</Text>
              <Text style={[styles.optional, { color: theme.subtle }]}>Optional · choose as many as you want</Text>
              <View style={styles.impactChoices} accessibilityRole="list">
                {impactOptions.map((option) => {
                  const selected = impacts.includes(option.value);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={option.value}
                      onPress={() => toggleImpact(option.value)}
                      style={({ pressed }) => [styles.impactChoice, { borderColor: selected ? theme.ink : theme.border, backgroundColor: selected ? theme.ink : theme.backgroundRaised }, pressed && styles.pressed]}>
                      {selected ? <SelectionFade><Ionicons name="checkmark" size={15} color={theme.invertedInk} /></SelectionFade> : null}
                      <Text style={[styles.impactText, { color: selected ? theme.invertedInk : theme.muted }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 'routine' ? (
            <>
              <EmphasisText before="What would you like help " emphasis="remembering?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Choose only what is useful. These are reminders for your own instructions—not a care plan.</Text>
              <Text style={[styles.optional, { color: theme.subtle }]}>Optional · you can change this later</Text>
              <View style={[styles.routineList, { borderColor: theme.borderSoft }]}>
                {routineOptions.map((option, index) => {
                  const selected = routineChoices.includes(option.value);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={option.value}
                      onPress={() => toggleRoutine(option.value)}
                      style={({ pressed }) => [styles.routineChoice, index > 0 && { borderTopColor: theme.borderSoft, borderTopWidth: 1 }, pressed && styles.pressed]}>
                      <Ionicons name={option.icon} size={20} color={selected ? theme.ink : theme.subtle} />
                      <View style={styles.routineCopy}>
                        <Text style={[styles.routineTitle, { color: theme.ink }]}>{option.title}</Text>
                        <Text style={[styles.routineDetail, { color: theme.muted }]}>{option.detail}</Text>
                      </View>
                      <View style={[styles.checkbox, { borderColor: selected ? theme.ink : theme.border, backgroundColor: selected ? theme.ink : 'transparent' }]}>
                        {selected ? <Ionicons name="checkmark" size={15} color={theme.invertedInk} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 'routine_times' ? (
            <>
              <EmphasisText before="When would reminders be " emphasis="useful?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Choose times from your own routine or instructions. Leave any item blank to track it without a notification.</Text>
              <Text style={[styles.optional, { color: theme.subtle }]}>You can change any of these later in Daily routine.</Text>
              <View style={styles.reminderTimes}>
                {routineOptions.filter((option): option is typeof option & { value: RoutineTaskChoice } => option.value !== 'medication' && routineChoices.includes(option.value)).map((option) => (
                  <View key={option.value} style={styles.reminderTimeRow}>
                    <View style={styles.routineCopy}><Text style={[styles.routineTitle, { color: theme.ink }]}>{option.title}</Text><Text style={[styles.routineDetail, { color: theme.muted }]}>{routineTimes[option.value] ? 'Daily reminder' : 'No reminder selected'}</Text></View>
                    <TimeField value={routineTimes[option.value] ?? ''} onChangeText={(time) => setRoutineTimes((current) => ({ ...current, [option.value]: time }))} style={styles.onboardingTime} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {step === 'medicine' ? (
            <>
              <EmphasisText before="Add your " emphasis="medicines?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Copy each name from its label, then choose the reminder time and exact days you were given.</Text>
              <Text style={[styles.optional, { color: theme.subtle }]}>Add as many as you need. You can edit these, add more times, or add more medicines later.</Text>
              {medicines.length ? <View style={styles.savedMedicines}>{medicines.map((medicine) => (
                <View key={medicine.id} style={[styles.savedMedicine, { borderColor: editingMedicineId === medicine.id ? theme.ink : theme.borderSoft, backgroundColor: theme.surface }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${medicine.name}`} onPress={() => editMedicine(medicine)} style={styles.savedMedicineCopy}>
                    <Text style={[styles.routineTitle, { color: theme.ink }]}>{medicine.name}</Text>
                    <Text style={[styles.routineDetail, { color: theme.muted }]}>{medicine.time} · {weekdaySummary(medicine.weekdays)}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${medicine.name}`} hitSlop={8} onPress={() => removeMedicine(medicine.id)}><Ionicons name="trash-outline" size={18} color={theme.danger} /></Pressable>
                </View>
              ))}</View> : null}
              <Text style={[styles.formLabel, { color: theme.muted }]}>{editingMedicineId ? 'Edit medicine' : medicines.length ? 'Add another medicine' : 'First medicine'}</Text>
              <Field value={medicineName} onChangeText={setMedicineName} placeholder="Medicine name" autoCapitalize="words" />
              <TimeField value={medicineTime} onChangeText={setMedicineTime} allowClear={false} />
              <View style={styles.onboardingWeekdays}>{WEEKDAY_OPTIONS.map((day) => { const selected = medicineWeekdays.includes(day.value); return <Pressable key={day.label} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: selected }} onPress={() => toggleMedicineWeekday(day.value)} style={[styles.onboardingWeekday, { borderColor: selected ? theme.ink : theme.border, backgroundColor: selected ? theme.ink : theme.backgroundRaised }]}><Text style={[styles.weekdayText, { color: selected ? theme.invertedInk : theme.muted }]}>{day.short}</Text></Pressable>; })}</View>
              <Button title={editingMedicineId ? 'Update medicine' : medicines.length ? 'Add another medicine' : 'Add medicine'} kind="secondary" disabled={!medicineName.trim() || !medicineTime || !medicineWeekdays.length} onPress={saveMedicineDraft} />
              {editingMedicineId ? <Pressable onPress={resetMedicineDraft}><Text style={[styles.textAction, { color: theme.muted }]}>Cancel editing</Text></Pressable> : null}
              {!medicines.length ? <Pressable onPress={() => { resetMedicineDraft(); setStepIndex((current) => Math.min(current + 1, steps.length - 1)); }}><Text style={[styles.textAction, { color: theme.muted }]}>I’ll add medicines later</Text></Pressable> : null}
            </>
          ) : null}

          {step === 'checkin_reminder' ? (
            <>
              <EmphasisText before="When would you like a quiet reminder to " emphasis="check in?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>A single gentle prompt to record the day. Medicine and time-sensitive recovery reminders stay separate.</Text>
              <ChoiceRow value={checkInReminderChoice} onChange={chooseCheckInReminder} options={[
                { label: 'Evening · recommended', value: 'evening' },
                { label: 'Morning', value: 'morning' },
                { label: 'Choose a time', value: 'custom' },
                { label: 'No daily reminder', value: 'none' },
              ]} />
              {checkInReminderChoice && checkInReminderChoice !== 'none' ? <TimeField value={checkInTime} onChangeText={setCheckInTime} allowClear={false} accessibilityLabel="Daily check-in reminder time" /> : null}
              <Text style={[styles.optional, { color: theme.subtle }]}>You can change or disable this later in Daily routine.</Text>
            </>
          ) : null}

          {step === 'notification_permission' ? (
            <>
              <EmphasisText before="Let your reminders " emphasis="reach you." style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Fistula Tracker needs notification permission to send the medicines, routines, and check-ins you chose.</Text>
              <View style={[styles.permissionCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                <View style={[styles.permissionIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name={notificationPermissionAllowed === true ? 'checkmark' : 'notifications-outline'} size={22} color={theme.ink} />
                </View>
                <View style={styles.permissionCopy}>
                  <Text style={[styles.permissionTitle, { color: theme.ink }]}>{notificationPermissionAllowed === true ? 'Notifications are enabled' : notificationPermissionAllowed === false ? 'Notifications are off' : 'Checking notification access…'}</Text>
                  <Text style={[styles.permissionBody, { color: theme.muted }]}>{notificationPermissionAllowed === true ? 'Your chosen reminders will be scheduled when setup is complete.' : notificationPermissionAllowed === false ? 'Your choices and times are still saved. Enable notifications here, or continue without them.' : 'This will only take a moment.'}</Text>
                </View>
              </View>
              <Text style={[styles.optional, { color: theme.subtle }]}>Permission is used only for on-device reminders. Your recovery information stays on this device.</Text>
            </>
          ) : null}

          {step === 'appearance' ? (
            <>
              <Text style={[styles.kicker, { color: theme.muted }]}>One last comfort choice.</Text>
              <EmphasisText before="How should this space " emphasis="feel?" style={styles.question} />
              <Text style={[styles.support, { color: theme.muted }]}>Light is the default. Choose dark if it is easier on your eyes; you can switch any time in Settings.</Text>
              <ChoiceRow value={appearance} onChange={chooseAppearance} options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]} />
            </>
          ) : null}

          {step === 'promise' ? (
            <>
              <EmphasisText before="During recovery, I kept promising myself I would " emphasis="live differently." style={styles.editorial} />
              <Text style={[styles.support, { color: theme.muted }]}>Travel. Make things. Stop postponing the life I wanted.</Text>
              {!replaying ? (
                <View style={styles.askBlock}>
                  <Text style={[styles.ask, { color: theme.ink }]}>What is one thing you want to return to?</Text>
                  <Field value={wish} onChangeText={setWish} placeholder="Travel, meet friends, sit comfortably…" returnKeyType="done" />
                  <Pressable accessibilityRole="button" onPress={() => { setWish(''); next(); }} hitSlop={10}>
                    <Text style={[styles.textAction, { color: theme.muted }]}>I’ll add this later</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'purpose' ? (
            <>
              <EmphasisText before="So I built the companion I wish I had " emphasis="back then." style={styles.editorial} />
              <Text style={[styles.supportLarge, { color: theme.muted }]}>A private place to record the difficult days, notice change over time, and remember what you want to return to.</Text>
              {!replaying && wish.trim() ? (
                <View style={[styles.reflectionCard, { borderColor: theme.borderSoft }]}>
                  <Text style={[styles.reflectionLabel, { color: theme.subtle }]}>You said you want to</Text>
                  <Text style={[styles.reflectionValue, { color: theme.ink }]}>{wish.trim()}</Text>
                  <Text style={[styles.reflectionSupport, { color: theme.muted }]}>We’ll keep that here for you, {firstName}.</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'honest' ? (
            <>
              <EmphasisText before="This really does " emphasis="suck." style={styles.editorial} />
              <Text style={[styles.supportLarge, { color: theme.muted }]}>{replaying ? 'Things do get better over time. Take it from someone who has already been through two surgeries.' : honestSupport(situation || 'unsure', recurrence || 'unsure')}</Text>
              <Text style={[styles.support, { color: theme.muted }]}>I’ve already been through this twice, and now I may be facing it again. Difficult days do pass.</Text>
            </>
          ) : null}

          {step === 'finish' ? (
            <>
              <EmphasisText before="This space is " emphasis="yours now." style={styles.editorial} />
              <Text style={[styles.supportLarge, { color: theme.muted }]}>Record only what feels useful. Skip anything you do not know. Everything stays on this device.</Text>
              <Text style={[styles.closing, { color: theme.ink }]}>I hope you recover soon. And I hope you will not need this app for long.</Text>
              <View style={[styles.safety, { borderTopColor: theme.borderSoft }]}>
                <Text style={[styles.safetyText, { color: theme.subtle }]}>This is a private record of your experience. It does not diagnose, judge, predict, or recommend treatment.</Text>
              </View>
            </>
          ) : null}
        </AnimatedStage>

        <Animated.View layout={LinearTransition.duration(190).reduceMotion(ReduceMotion.System)} style={styles.footer}>
          {requirement ? <InlineRequirement>{requirement}</InlineRequirement> : null}
          {step === 'notification_permission' ? (
            notificationPermissionAllowed === true ? (
              <Button title="Continue" icon="arrow-forward" onPress={next} />
            ) : (
              <>
                <Button
                  title={notificationPermissionAllowed === null ? 'Checking notification access…' : requestingNotificationPermission ? 'Opening notification access…' : notificationPermissionCanAskAgain === false ? 'Open notification settings' : 'Enable notifications'}
                  icon="notifications-outline"
                  disabled={notificationPermissionAllowed === null || requestingNotificationPermission}
                  onPress={() => void enableNotifications()}
                />
                <Button title="Continue without notifications" kind="ghost" disabled={requestingNotificationPermission} onPress={continueWithoutNotifications} />
              </>
            )
          ) : (
            <Button
              title={step === 'finish' ? (replaying ? 'Back to settings' : saving ? 'Starting…' : 'Start my recovery') : 'Continue'}
              icon={step === 'finish' ? undefined : 'arrow-forward'}
              disabled={saving || Boolean(requirement)}
              onPress={step === 'finish' ? () => void finish() : next}
            />
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 580 },
  top: { gap: 13, paddingTop: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  back: { minWidth: 54, minHeight: 28, justifyContent: 'center' },
  backText: { fontFamily: fonts.medium, fontSize: 15 },
  count: { fontFamily: fonts.medium, fontSize: 13 },
  beat: { flex: 1, justifyContent: 'flex-start', gap: 18, paddingTop: 70, paddingBottom: 24 },
  compactBeat: { gap: 14, paddingTop: 54 },
  kicker: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  storyNote: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, maxWidth: 345 },
  question: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 54, letterSpacing: -0.65, maxWidth: 360 },
  editorial: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 54, letterSpacing: -0.65, maxWidth: 360 },
  support: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, maxWidth: 345 },
  supportLarge: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 27, maxWidth: 345 },
  askBlock: { gap: 12, marginTop: 2 },
  ask: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23 },
  optional: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, marginTop: -9 },
  textAction: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, textDecorationLine: 'underline' },
  impactChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  impactChoice: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  impactText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  routineList: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  routineChoice: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  routineCopy: { flex: 1, gap: 1 },
  routineTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21 },
  routineDetail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18 },
  checkbox: { width: 23, height: 23, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  reminderTimes: { gap: 10 },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onboardingTime: { width: 145 },
  onboardingWeekdays: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  onboardingWeekday: { width: 40, height: 40, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { fontFamily: fonts.semibold, fontSize: 15 },
  savedMedicines: { gap: 8 },
  savedMedicine: { minHeight: 62, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedMedicineCopy: { flex: 1, gap: 2 },
  formLabel: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  permissionCard: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  permissionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  permissionCopy: { flex: 1, gap: 3 },
  permissionTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  permissionBody: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  reflectionCard: { borderWidth: 1, borderRadius: 17, padding: 17, gap: 5, marginTop: 3 },
  reflectionLabel: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  reflectionValue: { fontFamily: fonts.serifItalic, fontSize: 28, lineHeight: 35 },
  reflectionSupport: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  closing: { fontFamily: fonts.serifItalic, fontSize: 24, lineHeight: 31, maxWidth: 345 },
  safety: { borderTopWidth: 1, paddingTop: 16, marginTop: 2 },
  safetyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  footer: { paddingTop: 10, paddingBottom: 4, gap: 9 },
  pressed: { opacity: 0.55 },
});
