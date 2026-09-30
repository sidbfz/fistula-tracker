import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Divider, EmphasisText, fonts, Screen, useTheme } from '@/src/components/ui';
import { useApp } from '@/src/context/app-context';
import { formatDate, todayISO } from '@/src/lib/date';
import { getDailyLog, getSetting, listDailyLogs, listMedicationEvents, listMedications, listPhotos, listRecoveryItems, listRoutineEvents, listRoutineTasks } from '@/src/lib/db';
import { buildTodayItems } from '@/src/lib/today';
import type { TodayRoutineItem } from '@/src/types';

function daysSince(date?: string | null) {
  if (!date) return null;
  const start = new Date(`${date}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function greetingName(value?: string | null) {
  const firstName = value?.trim().split(/\s+/)[0];
  if (!firstName || /^(hi|hey|hello)$/i.test(firstName)) return '';
  return firstName;
}

function checkInPrompt(impacts: string[]) {
  if (impacts.includes('stress')) return { before: 'How are you holding up ', emphasis: 'today?' };
  if (impacts.includes('work_studies')) return { before: 'How manageable did ', emphasis: 'today', after: ' feel?' };
  if (impacts.includes('sitting')) return { before: 'How did sitting or movement ', emphasis: 'feel today?' };
  return { before: 'How are you ', emphasis: 'today?' };
}

export default function HomeScreen() {
  const theme = useTheme();
  const { displayName, profile } = useApp();
  const [checkedIn, setCheckedIn] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [impacts, setImpacts] = useState<string[]>([]);
  const [todayItems, setTodayItems] = useState<TodayRoutineItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        getDailyLog(todayISO()),
        listPhotos(),
        listRecoveryItems(),
        listDailyLogs(),
        getSetting('onboarding_impacts'),
        listMedications(),
        listRoutineTasks(false),
        listMedicationEvents(),
        listRoutineEvents(),
      ]).then(([log, photos, items, logs, savedImpacts, medications, routineTasks, medicationEvents, routineEvents]) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 6);
        const cutoffISO = new Date(cutoff.getTime() - cutoff.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
        setCheckedIn(Boolean(log));
        setPhotoCount(photos.length);
        setWishCount(items.filter((item) => !item.completed).length);
        setWeekDates(logs.filter((item) => item.log_date >= cutoffISO).map((item) => item.log_date));
        setTodayItems(buildTodayItems(medications, routineTasks, medicationEvents, routineEvents));
        try {
          const parsed = savedImpacts ? JSON.parse(savedImpacts) : [];
          setImpacts(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
        } catch {
          setImpacts([]);
        }
      });
    }, []),
  );

  const recoveryDay = useMemo(() => daysSince(profile?.surgery_date), [profile?.surgery_date]);
  const today = new Date();
  const firstName = greetingName(displayName);
  const greeting = `${greetingForHour(today.getHours())}${firstName ? `, ${firstName}` : ''}.`;
  const prompt = checkInPrompt(impacts);
  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    return { iso, day: date.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });

  const recoveryLine = profile?.had_surgery
    ? recoveryDay ? `Day ${recoveryDay} of recovery` : profile.recovery_stage
    : profile?.recovery_stage || 'Taking it one day at a time';

  const destinations = [
    { label: 'Recovery timeline', detail: 'Your days, in order', icon: 'time-outline' as const, route: '/(tabs)/timeline' as const },
    { label: 'Private photos', detail: photoCount ? `${photoCount} stored only here` : 'Stored only on this device', icon: 'lock-closed-outline' as const, route: '/photos' as const },
    { label: 'Journal', detail: 'Write down what matters', icon: 'book-outline' as const, route: '/(tabs)/notes' as const },
    { label: 'When I Recover', detail: wishCount ? `${wishCount} thing${wishCount === 1 ? '' : 's'} waiting for you` : 'Things worth getting better for', icon: 'sparkles-outline' as const, route: '/recovery-list' as const },
  ];

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={[styles.greeting, { color: theme.muted }]}>{greeting}</Text>
        <Text style={[styles.recoveryLine, { color: theme.ink }]}>{recoveryLine}</Text>
        {profile?.surgery_date ? <Text style={[styles.date, { color: theme.muted }]}>Since {formatDate(profile.surgery_date)}</Text> : null}
        <Text style={[styles.editorial, { color: theme.muted }]}>One day at a time.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/check-in')}
        style={({ pressed }) => [styles.checkIn, { backgroundColor: theme.feature }, pressed && styles.pressed]}>
        <View style={styles.checkText}>
          <Text style={[styles.checkEyebrow, { color: theme.featureMuted }]}>{checkedIn ? 'Checked in today' : 'Today'}</Text>
          {checkedIn ? <Text style={[styles.checkTitle, { color: theme.featureInk }]}>Want to change anything?</Text> : <EmphasisText before={prompt.before} emphasis={prompt.emphasis} after={prompt.after} style={[styles.checkTitle, { color: theme.featureInk }]} />}
          <Text style={[styles.checkHint, { color: theme.featureMuted }]}>{checkedIn ? 'Your entry is already saved.' : 'Usually less than 30 seconds.'}</Text>
        </View>
        <Ionicons name={checkedIn ? 'checkmark-circle-outline' : 'arrow-forward'} size={27} color={theme.featureInk} />
      </Pressable>

      {todayItems.length ? (
        <View style={[styles.todayCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <View style={styles.todayHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>Today’s routine</Text>
              <Text style={[styles.todayHint, { color: theme.muted }]}>Your schedule, never a score.</Text>
            </View>
            <Pressable accessibilityRole="link" onPress={() => router.push('/reminders')} hitSlop={10}>
              <Text style={[styles.todayLink, { color: theme.muted }]}>See all</Text>
            </Pressable>
          </View>
          {todayItems.slice(0, 3).map((item, index) => (
            <View key={item.key}>
              {index ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(item.source === 'medication' ? '/medications' : '/reminders')}
                style={({ pressed }) => [styles.todayRow, pressed && styles.pressed]}>
                <View style={[styles.todayIcon, { backgroundColor: theme.backgroundRaised }]}>
                  <Ionicons name={item.completed ? 'checkmark' : item.source === 'medication' ? 'medical-outline' : 'leaf-outline'} size={18} color={theme.muted} />
                </View>
                <View style={styles.linkCopy}>
                  <Text style={[styles.todayTitle, { color: item.completed ? theme.subtle : theme.ink }]}>{item.title}</Text>
                  <Text style={[styles.todayHint, { color: theme.muted }]}>{item.completed ? 'Recorded today' : item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.subtle} />
              </Pressable>
            </View>
          ))}
          {todayItems.length > 3 ? <Text style={[styles.moreItems, { color: theme.subtle }]}>+ {todayItems.length - 3} more in your routine</Text> : null}
        </View>
      ) : null}

      <View style={styles.week}>
        <View style={styles.weekHeader}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Your last few days</Text>
          <Text style={[styles.weekNote, { color: theme.subtle }]}>Recorded, not scored</Text>
        </View>
        <View style={styles.dayRow}>
          {sevenDays.map(({ iso, day }) => {
            const recorded = weekDates.includes(iso);
            return (
              <View key={iso} style={styles.day}>
                <View style={[styles.dayMark, { borderColor: theme.border, backgroundColor: recorded ? theme.ink : 'transparent' }]} />
                <Text style={[styles.dayLabel, { color: recorded ? theme.ink : theme.subtle }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Divider />

      <View style={styles.links}>
        {destinations.map((item) => (
          <Pressable key={item.route} accessibilityRole="button" onPress={() => router.push(item.route)} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <View style={[styles.linkIcon, { backgroundColor: theme.backgroundRaised }]}>
                <Ionicons name={item.icon} size={20} color={theme.muted} />
                </View>
                <View style={styles.linkCopy}>
                  <Text style={[styles.linkTitle, { color: theme.ink }]}>{item.label}</Text>
                  <Text style={[styles.linkDetail, { color: theme.muted }]}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
          </Pressable>
        ))}
      </View>

      <View style={styles.privateNote}>
        <Ionicons name="shield-checkmark-outline" size={15} color={theme.subtle} />
        <Text style={[styles.privateText, { color: theme.subtle }]}>Private, offline, and never a diagnosis.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { paddingTop: 16, paddingBottom: 24, gap: 5 },
  greeting: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22 },
  recoveryLine: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 57, letterSpacing: -0.7, marginTop: 15, maxWidth: 360, paddingBottom: 2 },
  date: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  editorial: { fontFamily: fonts.serifItalic, fontSize: 24, lineHeight: 30, marginTop: 8 },
  checkIn: { minHeight: 146, borderRadius: 18, paddingHorizontal: 23, paddingVertical: 22, flexDirection: 'row', alignItems: 'center', gap: 16 },
  checkText: { flex: 1, gap: 5 },
  checkEyebrow: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  checkTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 39, letterSpacing: -0.35 },
  checkHint: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  todayCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 17, paddingVertical: 15, gap: 3 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 8 },
  todayLink: { fontFamily: fonts.medium, fontSize: 14, textDecorationLine: 'underline' },
  todayRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  todayIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  todayTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21 },
  todayHint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  moreItems: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, paddingTop: 7, textAlign: 'center' },
  week: { paddingVertical: 18, gap: 18 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  weekNote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 8, minWidth: 30 },
  dayMark: { width: 17, height: 17, borderRadius: 9, borderWidth: 1 },
  dayLabel: { fontFamily: fonts.medium, fontSize: 13 },
  links: { gap: 7, paddingTop: 8 },
  link: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10 },
  linkIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  linkCopy: { flex: 1, gap: 3 },
  linkTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  linkDetail: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 14 },
  privateText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.58 },
});
