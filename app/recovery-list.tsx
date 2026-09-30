import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, Divider, EmptyState, Field, fonts, Screen, SelectionFade, useTheme } from '@/src/components/ui';
import { deleteRecoveryItem, listRecoveryItems, saveRecoveryItem, toggleRecoveryItem } from '@/src/lib/db';
import type { RecoveryItem } from '@/src/types';

export default function RecoveryListScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<number | undefined>();
  const load = useCallback(async () => setItems(await listRecoveryItems()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    if (!title.trim()) return Alert.alert('Add something meaningful', 'A few words are enough.');
    await saveRecoveryItem(title, editingId);
    setTitle('');
    setEditingId(undefined);
    await load();
  }

  function remove(item: RecoveryItem) {
    Alert.alert('Delete this?', 'This cannot be recovered.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void (async () => { await deleteRecoveryItem(item.id); await load(); })() },
    ]);
  }

  return (
    <Screen>
      <BackButton />
      <View style={styles.intro}>
        <Text style={[styles.kicker, { color: theme.subtle }]}>A note to future you</Text>
        <Text style={[styles.title, { color: theme.ink }]}>When I Recover</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Things worth getting better for.</Text>
      </View>

      <Text style={[styles.reflection, { color: theme.ink }]}>These are the things I want to do when I get my life back.</Text>

      <View style={[styles.editor, { borderTopColor: theme.borderSoft, borderBottomColor: theme.borderSoft }]}>
        <Text style={[styles.prompt, { color: theme.ink }]}>{editingId ? 'Rewrite this thought' : 'What are you looking forward to?'}</Text>
        <Field value={title} onChangeText={setTitle} placeholder="Take that trip, see my friends..." />
        <Button title={editingId ? 'Save the change' : 'Remember this'} onPress={() => void save()} />
        {editingId ? <Button title="Cancel" kind="ghost" onPress={() => { setEditingId(undefined); setTitle(''); }} /> : null}
      </View>

      <Text style={[styles.listTitle, { color: theme.ink }]}>Things worth returning to</Text>
      {items.length ? items.map((item, index) => {
        const completed = Boolean(item.completed);
        return (
          <View key={item.id}>
            {index ? <Divider /> : null}
            <View style={[styles.itemRow, completed && styles.completedRow]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completed }}
                accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`}
                onPress={() => void toggleRecoveryItem(item.id, !completed).then(load)}
                style={[styles.check, { borderColor: completed ? theme.ink : theme.border, backgroundColor: completed ? theme.ink : 'transparent' }]}>
                {completed ? <SelectionFade><Ionicons name="checkmark" size={16} color={theme.invertedInk} /></SelectionFade> : null}
              </Pressable>
              <View style={styles.itemCopy}>
                <Text style={[styles.itemText, { color: completed ? theme.muted : theme.ink }, completed && styles.completed]}>{item.title}</Text>
                <Text style={[styles.status, { color: theme.subtle }]}>{completed ? 'You actually did it.' : 'Waiting for future you.'}</Text>
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" onPress={() => { setEditingId(item.id); setTitle(item.title); }}><Text style={[styles.action, { color: theme.muted }]}>Edit</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => remove(item)}><Text style={[styles.action, { color: theme.danger }]}>Delete</Text></Pressable>
                </View>
              </View>
            </View>
          </View>
        );
      }) : <EmptyState icon="sparkles-outline">What are you dreaming about doing again? Put the first thought here.</EmptyState>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 5, paddingTop: 8 },
  kicker: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  title: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 50, letterSpacing: -1.25 },
  subtitle: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  reflection: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 35, maxWidth: 330, paddingVertical: 24 },
  editor: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, gap: 13 },
  prompt: { fontFamily: fonts.semibold, fontSize: 17 },
  listTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27, marginTop: 18 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 20 },
  completedRow: { opacity: 0.76 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemCopy: { flex: 1, gap: 5 },
  itemText: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 25 },
  completed: { textDecorationLine: 'line-through' },
  status: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 7 },
  action: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
});
