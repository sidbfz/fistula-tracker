import { useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, DateField, Divider, EmptyState, Field, fonts, Heading, Label, Reveal, Screen, useTheme } from '@/src/components/ui';
import { displayDateToISO, formatDate, isoToDisplayDate, todayDisplayDate } from '@/src/lib/date';
import { deleteJournalEntry, listJournalEntries, saveJournalForDate } from '@/src/lib/db';
import type { JournalEntry } from '@/src/types';

export default function JournalScreen() {
  const theme = useTheme();
  const pathname = usePathname();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entryDate, setEntryDate] = useState(todayDisplayDate());
  const [body, setBody] = useState('');
  const selectedDate = displayDateToISO(entryDate);
  const selectedEntry = entries.find((entry) => entry.entry_date === selectedDate);
  const load = useCallback(async (date = entryDate) => {
    const loaded = await listJournalEntries();
    const dateISO = displayDateToISO(date);
    setEntries(loaded);
    setBody(loaded.find((entry) => entry.entry_date === dateISO)?.body ?? '');
  }, [entryDate]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function chooseDate(value: string) {
    setEntryDate(value);
    const dateISO = displayDateToISO(value);
    setBody(entries.find((entry) => entry.entry_date === dateISO)?.body ?? '');
  }

  function edit(entry: JournalEntry) {
    setEntryDate(isoToDisplayDate(entry.entry_date));
    setBody(entry.body);
  }

  async function save() {
    const entryDateISO = displayDateToISO(entryDate);
    if (!entryDateISO) return Alert.alert('Check the date', 'Choose the entry date from the calendar.');
    if (!body.trim()) return Alert.alert('Write something first', 'Journal entries cannot be empty.');
    await saveJournalForDate(entryDateISO, body);
    await load(entryDate);
  }

  function remove(entry: JournalEntry) {
    Alert.alert('Delete journal entry?', 'This cannot be recovered.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void (async () => {
        await deleteJournalEntry(entry.id);
        await load(entryDate);
      })() },
    ]);
  }

  return (
    <Screen>
      {pathname === '/notes' ? null : <BackButton />}
      <Heading title="Journal" subtitle="The same dated notes you write during a check-in, together in one place." />

      <View style={[styles.editor, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
        <Text style={[styles.editorTitle, { color: theme.ink }]}>{selectedEntry ? 'Return to this thought' : 'A quiet page'}</Text>
        <Text style={[styles.editorSubtitle, { color: theme.muted }]}>{selectedEntry ? 'Change anything you need.' : 'There is no right way to write this.'}</Text>
        <Label>Date</Label>
        <DateField value={entryDate} onChangeText={chooseDate} />
        <Field multiline value={body} onChangeText={setBody} placeholder="What is on your mind today?" style={styles.journalField} />
        <Button title={selectedEntry ? 'Update this entry' : 'Keep this entry'} onPress={() => void save()} />
      </View>

      <View style={styles.entriesHeader}>
        <Text style={[styles.entriesTitle, { color: theme.ink }]}>Pages behind you</Text>
        <Text style={[styles.entriesCount, { color: theme.subtle }]}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
      </View>

      {entries.length ? entries.map((entry, index) => (
        <View key={entry.id}>
          {index ? <Divider /> : null}
          <Reveal delay={Math.min(index * 45, 225)} style={styles.entry}>
            <Text style={[styles.date, { color: theme.muted }]}>{formatDate(entry.entry_date)}</Text>
            <Text style={[styles.body, { color: theme.ink }]}>{entry.body}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => edit(entry)}><Text style={[styles.actionText, { color: theme.muted }]}>Edit</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => remove(entry)}><Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text></Pressable>
            </View>
          </Reveal>
        </View>
      )) : <EmptyState icon="book-outline">This journal is waiting for its first page. A few honest words are enough.</EmptyState>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { borderWidth: 1, borderRadius: 20, padding: 19, gap: 13 },
  editorTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27 },
  editorSubtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, marginTop: -6 },
  journalField: { minHeight: 170, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29 },
  entriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 15 },
  entriesTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27 },
  entriesCount: { fontFamily: fonts.medium, fontSize: 13 },
  entry: { paddingVertical: 22, gap: 10 },
  date: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  body: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 30 },
  actions: { flexDirection: 'row', gap: 22, marginTop: 4 },
  actionText: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
});
