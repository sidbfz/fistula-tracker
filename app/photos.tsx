import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, type ImageStyle, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedStage, BackButton, Button, DateField, EmptyState, fonts, Heading, IconButton, Label, Pill, Screen, useTheme } from '@/src/components/ui';
import { useApp } from '@/src/context/app-context';
import { displayDateToISO, formatDate, todayDisplayDate } from '@/src/lib/date';
import { addPhoto, deletePhotoRecord, listPhotos } from '@/src/lib/db';
import { copyPhotoToPrivateStorage, deletePrivatePhoto } from '@/src/lib/photos';
import type { WoundPhoto } from '@/src/types';

export default function PhotosScreen() {
  const theme = useTheme();
  const { profile } = useApp();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<WoundPhoto>>(null);
  const [photos, setPhotos] = useState<WoundPhoto[]>([]);
  const [photoDate, setPhotoDate] = useState(todayDisplayDate());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const itemWidth = width - 76;

  function recoveryDayFor(date: string) {
    if (!profile?.surgery_date) return null;
    const start = new Date(`${profile.surgery_date}T00:00:00`).getTime();
    const target = new Date(`${date}T00:00:00`).getTime();
    return Math.max(1, Math.floor((target - start) / 86_400_000) + 1);
  }

  const load = useCallback(async () => {
    const rows = await listPhotos();
    setPhotos(rows);
    setCurrentIndex((current) => Math.min(current, Math.max(0, rows.length - 1)));
  }, []);

  useFocusEffect(useCallback(() => {
    setRevealed(false);
    setPlaying(false);
    void load();
  }, [load]));

  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        const next = (current + 1) % photos.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [playing, photos.length]);

  async function choosePhoto(source: 'camera' | 'library') {
    const photoDateISO = displayDateToISO(photoDate);
    if (!photoDateISO) {
      Alert.alert('Check the date', 'Choose the photo date from the calendar.');
      return;
    }
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to take a wound photo.');
        return;
      }
    }
    setBusy(true);
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return;
      const privateUri = copyPhotoToPrivateStorage(result.assets[0].uri);
      try {
        await addPhoto(photoDateISO, privateUri);
      } catch (reason) {
        deletePrivatePhoto(privateUri);
        throw reason;
      }
      const rows = await listPhotos();
      setPhotos(rows);
      const newIndex = rows.findIndex((photo) => photo.file_uri === privateUri);
      setCurrentIndex(newIndex);
      setRevealed(false);
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: newIndex, animated: true }));
    } catch (reason) {
      Alert.alert('Could not save photo', reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function goTo(index: number) {
    if (!photos.length) return;
    const next = Math.max(0, Math.min(index, photos.length - 1));
    setCurrentIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }

  function confirmDelete() {
    const current = photos[currentIndex];
    if (!current) return;
    Alert.alert('Delete this private photo?', 'The photo and its record will be permanently removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void (async () => {
        try {
          deletePrivatePhoto(current.file_uri);
          await deletePhotoRecord(current.id);
          setPlaying(false);
          setRevealed(false);
          await load();
        } catch (reason) {
          Alert.alert('Could not delete photo', reason instanceof Error ? reason.message : 'Please try again.');
        }
      })() },
    ]);
  }

  function toggleSlideshow() {
    if (!revealed) setRevealed(true);
    setPlaying((value) => !value);
  }

  return (
    <Screen>
      <BackButton />
      <Heading title="Private recovery photos" subtitle="Stored only on this device. Photos stay hidden until you choose to reveal them." />

      <View style={[styles.addArea, { borderTopColor: theme.borderSoft, borderBottomColor: theme.borderSoft }]}>
        <View style={styles.addTop}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.subtle} />
          <View style={styles.addCopy}>
            <Text style={[styles.addTitle, { color: theme.ink }]}>Only you can see these</Text>
            <Text style={[styles.addSubtitle, { color: theme.muted }]}>Photos are copied into app-only storage, never added to your gallery.</Text>
          </View>
        </View>
        <Label>Photo date</Label>
        <DateField value={photoDate} onChangeText={setPhotoDate} />
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => void choosePhoto('camera')} style={({ pressed }) => [styles.sourceButton, { borderColor: theme.border, backgroundColor: theme.surface }, pressed && styles.pressed]}>
            <Ionicons name="camera-outline" size={20} color={theme.ink} />
            <Text style={[styles.sourceText, { color: theme.ink }]}>{busy ? 'Working...' : 'Camera'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => void choosePhoto('library')} style={({ pressed }) => [styles.sourceButton, { borderColor: theme.border, backgroundColor: theme.surface }, pressed && styles.pressed]}>
            <Ionicons name="image-outline" size={20} color={theme.ink} />
            <Text style={[styles.sourceText, { color: theme.ink }]}>Library</Text>
          </Pressable>
        </View>
      </View>

      {photos.length ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>Your visual record</Text>
            <Pill>{photos.length} PRIVATE</Pill>
          </View>
          <View style={[styles.viewer, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.viewerTop}>
              <View>
                <Text style={[styles.counter, { color: theme.subtle }]}>{recoveryDayFor(photos[currentIndex]?.photo_date ?? '') ? `DAY ${recoveryDayFor(photos[currentIndex]?.photo_date ?? '')} · ` : ''}{currentIndex + 1} OF {photos.length}</Text>
                <Text style={[styles.photoDate, { color: theme.ink }]}>{formatDate(photos[currentIndex]?.photo_date ?? '')}</Text>
              </View>
              <Pill tone={revealed ? 'accent' : 'success'}>{revealed ? 'VISIBLE' : 'HIDDEN'}</Pill>
            </View>

            <AnimatedStage stageKey={revealed ? 'revealed' : 'hidden'}>
            {revealed ? (
              <FlatList
                ref={listRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
                onMomentumScrollEnd={(event) => setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / itemWidth))}
                renderItem={({ item }) => (
                  <View style={{ width: itemWidth }}>
                    <Image source={{ uri: item.file_uri }} style={[styles.photo, { backgroundColor: theme.isDark ? '#050506' : '#E8E4DE' }] as ImageStyle} resizeMode="contain" />
                  </View>
                )}
              />
            ) : (
              <Pressable onPress={() => setRevealed(true)} style={({ pressed }) => [styles.privacyCover, { backgroundColor: theme.backgroundRaised, borderColor: theme.borderSoft }, pressed && styles.pressed]}>
                <Ionicons name="eye-off-outline" size={31} color={theme.subtle} />
                <Text style={[styles.coverTitle, { color: theme.ink }]}>Sensitive photo hidden</Text>
                <Text style={[styles.coverText, { color: theme.muted }]}>Reveal it only when you are somewhere private.</Text>
                <View style={[styles.revealPill, { borderColor: theme.border }]}>
                  <Ionicons name="eye-outline" size={15} color={theme.ink} />
                  <Text style={[styles.revealText, { color: theme.ink }]}>Reveal photo</Text>
                </View>
              </Pressable>
            )}
            </AnimatedStage>

            <View style={styles.dateRail}>
              {photos.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((photo) => (
                <View key={photo.id} style={[styles.dateDot, { backgroundColor: theme.border }, photo.id === photos[currentIndex]?.id && { ...styles.dateDotActive, backgroundColor: theme.ink }]} />
              ))}
            </View>
            <View style={styles.nav}>
              <IconButton icon="chevron-back" label="Previous photo" disabled={currentIndex === 0} onPress={() => goTo(currentIndex - 1)} />
              <Button title={playing ? 'Stop' : 'Slideshow'} kind="secondary" icon={playing ? 'pause' : 'play'} onPress={toggleSlideshow} />
              <IconButton icon="chevron-forward" label="Next photo" disabled={currentIndex === photos.length - 1} onPress={() => goTo(currentIndex + 1)} />
            </View>
            {revealed ? <Button title="Hide photo" kind="ghost" icon="eye-off-outline" onPress={() => { setRevealed(false); setPlaying(false); }} /> : null}
            <Button title="Delete current photo" kind="danger" icon="trash-outline" onPress={confirmDelete} />
          </View>
        </>
      ) : <EmptyState icon="images-outline">No recovery photos yet. Add one only when you feel comfortable.</EmptyState>}

      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.subtle} />
        <Text style={[styles.noticeText, { color: theme.subtle }]}>For your personal record only. No diagnosis, healing analysis, or medical scoring is performed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addArea: { paddingVertical: 19, borderTopWidth: 1, borderBottomWidth: 1, gap: 15 },
  addTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addCopy: { flex: 1 },
  addTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  addSubtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  sourceButton: { flex: 1, minHeight: 49, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 15 },
  sourceText: { fontFamily: fonts.semibold, fontSize: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 25 },
  viewer: { padding: 16, borderWidth: 1, borderRadius: 20, gap: 16 },
  viewerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontFamily: fonts.medium, fontSize: 13 },
  photoDate: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 25 },
  photo: { width: '100%', height: 390, borderRadius: 16 },
  privacyCover: { height: 390, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  coverTitle: { fontFamily: fonts.semibold, fontSize: 20, marginTop: 8 },
  coverText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 260 },
  revealPill: { flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, marginTop: 12 },
  revealText: { fontFamily: fonts.semibold, fontSize: 15 },
  dateRail: { flexDirection: 'row', justifyContent: 'center', gap: 7, minHeight: 8 },
  dateDot: { width: 5, height: 5, borderRadius: 3 },
  dateDotActive: { width: 18 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  notice: { flexDirection: 'row', gap: 9, paddingHorizontal: 4, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.6 },
});
