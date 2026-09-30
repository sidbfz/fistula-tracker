import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Divider, EmptyState, fonts, Heading, Reveal, Screen, useTheme } from '@/src/components/ui';
import { formatDate } from '@/src/lib/date';
import { listDailyLogs, listPhotos } from '@/src/lib/db';
import type { DailyLog, WoundPhoto } from '@/src/types';

const levels = ['None', 'A little', 'Moderate', 'A lot'];

function TrendRow({ title, values, field, max }: { title: string; values: DailyLog[]; field: 'pain' | 'bleeding' | 'drainage'; max: number }) {
  const theme = useTheme();
  return (
    <View style={styles.trendRow}>
      <Text style={[styles.trendTitle, { color: theme.muted }]}>{title}</Text>
      <View style={styles.bars}>
        {values.map((log) => {
          const value = log[field];
          return (
            <View key={log.id} style={styles.barColumn}>
              <View style={[styles.barTrack, { backgroundColor: theme.borderSoft }]}>
                <View style={[styles.bar, { height: value ? `${Math.max(12, (value / max) * 100)}%` : 2, backgroundColor: theme.ink }]} />
              </View>
              <Text style={[styles.barDay, { color: theme.subtle }]}>{log.log_date.slice(-2)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const theme = useTheme();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [photos, setPhotos] = useState<WoundPhoto[]>([]);

  useFocusEffect(useCallback(() => {
    void Promise.all([listDailyLogs(), listPhotos()]).then(([savedLogs, savedPhotos]) => {
      setLogs(savedLogs);
      setPhotos(savedPhotos);
    });
  }, []));

  const chronological = useMemo(() => [...logs].reverse(), [logs]);
  const recent = chronological.slice(-7);
  const moments = useMemo(() => {
    const dates = [...new Set([...logs.map((log) => log.log_date), ...photos.map((photo) => photo.photo_date)])].sort().reverse();
    return dates.map((date) => ({
      date,
      log: logs.find((log) => log.log_date === date),
      photoCount: photos.filter((photo) => photo.photo_date === date).length,
    }));
  }, [logs, photos]);

  return (
    <Screen>
      <Heading title="Recovery" subtitle="Your days, in order. Nothing here is interpreted or diagnosed." />

      {moments.length ? (
        <>
          {logs.length ? <View style={styles.trends}>
            <View style={styles.trendsHeader}>
              <View>
                <Text style={[styles.trendsHeading, { color: theme.ink }]}>Your last few days</Text>
                <Text style={[styles.trendsSub, { color: theme.muted }]}>A simple view of what you recorded</Text>
              </View>
              <Text style={[styles.daysCount, { color: theme.subtle }]}>{recent.length} {recent.length === 1 ? 'DAY' : 'DAYS'}</Text>
            </View>
            <TrendRow title="Pain" values={recent} field="pain" max={10} />
            <TrendRow title="Bleeding" values={recent} field="bleeding" max={3} />
            <TrendRow title="Drainage" values={recent} field="drainage" max={3} />
            <Text style={[styles.disclaimer, { color: theme.subtle }]}>Bar height mirrors only the number you entered. It is not a healing score.</Text>
          </View> : null}

          {logs.length ? <Divider /> : null}
          <Text style={[styles.storyTitle, { color: theme.ink }]}>The story so far</Text>

          <View style={styles.timeline}>
            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
            {moments.map(({ date, log, photoCount }, index) => {
              const careCount = log ? log.bowel_movement + log.sitz_bath + log.dressing_changed + log.medication_taken : 0;
              return (
                <Reveal key={date} delay={Math.min(index * 55, 275)} style={styles.timelineItem}>
                  <View style={[styles.dot, { borderColor: theme.background, backgroundColor: index === 0 ? theme.ink : theme.border }]} />
                  <View style={styles.dayMoment}>
                    <View style={styles.dayTop}>
                      <View>
                        <Text style={[styles.dayLabel, { color: theme.subtle }]}>{index === 0 ? 'MOST RECENT' : date.slice(0, 4)}</Text>
                        <Text style={[styles.dayDate, { color: theme.ink }]}>{formatDate(date)}</Text>
                      </View>
                      {log ? <View style={styles.painText}>
                        <Text style={[styles.painNumber, { color: theme.ink }]}>{log.pain}</Text>
                        <Text style={[styles.painLabel, { color: theme.subtle }]}>PAIN</Text>
                      </View> : null}
                    </View>

                    {log ? <Text style={[styles.observations, { color: theme.muted }]}>{levels[log.bleeding]} bleeding · {levels[log.drainage]} drainage</Text> : <Text style={[styles.observations, { color: theme.muted }]}>No check-in recorded for this day.</Text>}
                    {careCount ? <Text style={[styles.care, { color: theme.muted }]}>{careCount} care moment{careCount === 1 ? '' : 's'} recorded</Text> : null}
                    {photoCount ? (
                      <View style={styles.privatePhoto}>
                        <Ionicons name="lock-closed-outline" size={13} color={theme.subtle} />
                        <Text style={[styles.privatePhotoText, { color: theme.subtle }]}>{photoCount} private photo{photoCount === 1 ? '' : 's'}</Text>
                      </View>
                    ) : null}
                    {log?.notes ? <Text style={[styles.notes, { color: theme.ink, borderTopColor: theme.borderSoft }]}>“{log.notes}”</Text> : null}
                  </View>
                </Reveal>
              );
            })}
          </View>
        </>
      ) : <EmptyState icon="time-outline">Your recovery story begins with a check-in. One day is enough to start.</EmptyState>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trends: { gap: 18, paddingVertical: 12 },
  trendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  trendsHeading: { fontFamily: fonts.semibold, fontSize: 18 },
  trendsSub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, marginTop: 3 },
  daysCount: { fontFamily: fonts.medium, fontSize: 13, marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  trendTitle: { width: 72, fontFamily: fonts.medium, fontSize: 14 },
  bars: { flex: 1, height: 52, flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  barColumn: { width: 27, height: '100%', alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 2, opacity: 0.78 },
  barDay: { fontFamily: fonts.medium, fontSize: 13 },
  disclaimer: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  storyTitle: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 35, marginTop: 8 },
  timeline: { position: 'relative', paddingLeft: 30, gap: 30, paddingVertical: 8 },
  timelineLine: { position: 'absolute', left: 7, top: 19, bottom: 28, width: 1 },
  timelineItem: { position: 'relative' },
  dot: { position: 'absolute', left: -29, top: 8, width: 13, height: 13, borderRadius: 7, borderWidth: 3, zIndex: 2 },
  dayMoment: { gap: 7, paddingBottom: 4 },
  dayTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dayLabel: { fontFamily: fonts.medium, fontSize: 13 },
  dayDate: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  painText: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  painNumber: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 32 },
  painLabel: { fontFamily: fonts.medium, fontSize: 13 },
  observations: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  care: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  privatePhoto: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privatePhotoText: { fontFamily: fonts.medium, fontSize: 14 },
  notes: { fontFamily: fonts.serifItalic, fontSize: 20, lineHeight: 27, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
});
