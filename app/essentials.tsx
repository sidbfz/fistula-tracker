import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, Button, Divider, EmptyState, Field, fonts, Heading, Screen, SelectionFade, useTheme } from '@/src/components/ui';
import { deleteEssentialItem, listEssentialItems, restoreEssentialDefaults, saveEssentialItem, toggleEssentialItem } from '@/src/lib/db';
import type { EssentialItem } from '@/src/types';

export default function EssentialsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<EssentialItem[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setItems(await listEssentialItems()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await saveEssentialItem(title, editingId);
      setTitle('');
      setEditingId(undefined);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function edit(item: EssentialItem) {
    setTitle(item.title);
    setEditingId(item.id);
  }

  function remove(item: EssentialItem) {
    Alert.alert('Remove this item?', item.patient_shared ? 'You can restore patient-shared defaults later.' : 'This custom checklist item will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void deleteEssentialItem(item.id).then(load) },
    ]);
  }

  async function restore() {
    setBusy(true);
    try {
      await restoreEssentialDefaults();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Heading title="Recovery essentials" subtitle="A practical list you can shape around your own recovery." />
      <View style={[styles.notice, { borderColor: theme.borderSoft }]}>
        <Ionicons name="people-outline" size={19} color={theme.subtle} />
        <Text style={[styles.noticeText, { color: theme.muted }]}>Built-in items are ideas shared by patients, not medical requirements. Keep only what feels useful and follow your own care instructions.</Text>
      </View>

      <View style={styles.addRow}>
        <Field value={title} onChangeText={setTitle} placeholder={editingId ? 'Rename item' : 'Add your own item'} style={styles.field} returnKeyType="done" onSubmitEditing={() => void save()} />
        <View style={styles.addButton}><Button title={editingId ? 'Save' : 'Add'} disabled={busy || !title.trim()} onPress={() => void save()} /></View>
      </View>
      {editingId ? <Pressable onPress={() => { setEditingId(undefined); setTitle(''); }}><Text style={[styles.cancel, { color: theme.muted }]}>Cancel editing</Text></Pressable> : null}

      {items.length ? <View style={styles.list}>{items.map((item, index) => {
        const complete = Boolean(item.completed);
        return <View key={item.id}>{index ? <Divider /> : null}<View style={styles.itemRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: complete }} onPress={() => void toggleEssentialItem(item.id, !complete).then(load)} style={[styles.checkbox, { borderColor: complete ? theme.ink : theme.border, backgroundColor: complete ? theme.ink : 'transparent' }]}>{complete ? <SelectionFade><Ionicons name="checkmark" size={16} color={theme.invertedInk} /></SelectionFade> : null}</Pressable><Pressable style={styles.copy} onPress={() => edit(item)}><Text style={[styles.itemTitle, { color: complete ? theme.subtle : theme.ink, textDecorationLine: complete ? 'line-through' : 'none' }]}>{item.title}</Text><Text style={[styles.source, { color: theme.subtle }]}>{item.patient_shared ? 'Patient-shared idea · editable' : 'Your item'}</Text></Pressable><Pressable accessibilityLabel={`Remove ${item.title}`} onPress={() => remove(item)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={theme.danger} /></Pressable></View></View>;
      })}</View> : <EmptyState icon="bag-handle-outline">Your essentials list is empty. Add anything that would make recovery logistics easier.</EmptyState>}

      <Button title="Restore patient-shared ideas" kind="secondary" disabled={busy} onPress={() => void restore()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  field: { flex: 1 },
  addButton: { width: 82 },
  cancel: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline', alignSelf: 'flex-end' },
  list: { marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 11 },
  checkbox: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  source: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18 },
});
