import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  useColorScheme,
  type ViewStyle,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, interpolateColor, LinearTransition, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { displayDateToLocalDate, localDateToDisplayDate } from '@/src/lib/date';

export type AppTheme = {
  isDark: boolean;
  background: string;
  backgroundRaised: string;
  surface: string;
  surfaceElevated: string;
  surfaceWarm: string;
  ink: string;
  invertedInk: string;
  muted: string;
  subtle: string;
  primary: string;
  primaryBright: string;
  primarySoft: string;
  amber: string;
  rose: string;
  border: string;
  borderSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  white08: string;
  white12: string;
  action: string;
  actionText: string;
  feature: string;
  featureInk: string;
  featureMuted: string;
  overlay: string;
};

const darkTheme: AppTheme = {
  isDark: true,
  background: '#2B2723',
  backgroundRaised: '#37312B',
  surface: '#403930',
  surfaceElevated: '#4A4138',
  surfaceWarm: '#44392F',
  ink: '#F1ECE4',
  invertedInk: '#1A1816',
  muted: '#B7AEA3',
  subtle: '#8F867C',
  primary: '#EADFD3',
  primaryBright: '#F1ECE4',
  primarySoft: '#50463C',
  amber: '#D2A675',
  rose: '#C7A5A1',
  border: '#675B4F',
  borderSoft: '#53483E',
  danger: '#E59A92',
  dangerSoft: '#4A2C28',
  success: '#A2BDA9',
  white08: 'rgba(255,248,238,0.07)',
  white12: 'rgba(255,248,238,0.11)',
  action: '#EEE6DD',
  actionText: '#201C19',
  feature: '#D4BEA7',
  featureInk: '#241F1A',
  featureMuted: '#6B5C4F',
  overlay: 'rgba(12,10,8,0.44)',
};

const lightTheme: AppTheme = {
  ...darkTheme,
  isDark: false,
  background: '#F4F1EB',
  backgroundRaised: '#EEEAE3',
  surface: '#FAF8F4',
  surfaceElevated: '#FFFDF9',
  surfaceWarm: '#F1EDE5',
  ink: '#191919',
  invertedInk: '#F7F4EF',
  muted: '#6E6A65',
  subtle: '#918B84',
  primary: '#191919',
  primaryBright: '#191919',
  primarySoft: '#E6E1D9',
  amber: '#795B3E',
  rose: '#796969',
  border: '#D5D0C8',
  borderSoft: '#E2DED7',
  danger: '#A54141',
  dangerSoft: '#F3E5E3',
  success: '#4F745D',
  white08: 'rgba(0,0,0,0.05)',
  white12: 'rgba(0,0,0,0.08)',
  action: '#191919',
  actionText: '#F7F4EF',
  feature: '#24221F',
  featureInk: '#F3EEE6',
  featureMuted: '#C9C0B5',
  overlay: 'rgba(0,0,0,0.35)',
};

// Kept for non-render utility code. Screens should use useTheme() so device theme changes are reflected.
export const palette: AppTheme = darkTheme;

export function useTheme(): AppTheme {
  return useColorScheme() === 'light' ? lightTheme : darkTheme;
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T) {
  const theme = useTheme();
  const styles = useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
  return { theme, styles };
}

export const fonts = {
  regular: 'DarkerGrotesque_500Medium',
  medium: 'DarkerGrotesque_600SemiBold',
  semibold: 'DarkerGrotesque_700Bold',
  bold: 'DarkerGrotesque_800ExtraBold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 42 };
export const radii = { sm: 10, md: 15, lg: 20, xl: 26, round: 999 };

const screenEntering = FadeIn.duration(200).reduceMotion(ReduceMotion.System);
const stageEntering = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
const stageExiting = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const theme = useTheme();
  const inner = <Animated.View entering={screenEntering} style={[styles.screenInner, !scroll && styles.flex]}>{children}</Animated.View>;
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      showsVerticalScrollIndicator={false}>
      {inner}
    </ScrollView>
  ) : (
    <View style={styles.screenContent}>{inner}</View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AnimatedStage({ stageKey, children, style }: PropsWithChildren<{ stageKey: string | number; style?: StyleProp<ViewStyle> }>) {
  return (
    <Animated.View key={stageKey} entering={stageEntering} exiting={stageExiting} style={style}>
      {children}
    </Animated.View>
  );
}

export function Reveal({ children, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  return <View style={style}>{children}</View>;
}

export function SelectionFade({ children }: PropsWithChildren) {
  return <Animated.View entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}

export function SmoothSwitch({
  value,
  onValueChange,
  disabled = false,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const theme = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 210 });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.border, theme.action]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.muted, theme.actionText]),
    transform: [{ translateX: progress.value * 20 }],
  }));

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => {
        void Haptics.selectionAsync();
        onValueChange(!value);
      }}
      style={styles.smoothSwitchHitbox}>
      <Animated.View style={[styles.smoothSwitchTrack, trackStyle]}>
        <Animated.View style={[styles.smoothSwitchThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

export function EmphasisText({ before, emphasis, after, style }: { before?: string; emphasis: string; after?: string; editorial?: boolean; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text style={[styles.emphasisEditorial, { color: theme.ink }, style, styles.serifGuard]}>
      {before}<Text style={styles.emphasisItalic}>{emphasis}</Text>{after}
    </Text>
  );
}

export function Heading({
  title,
  subtitle,
  eyebrow,
  serif = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  serif?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: theme.subtle }]}>{eyebrow}</Text> : null}
      <Text style={[styles.h1, { color: theme.ink }, serif && styles.h1Serif]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, aside }: PropsWithChildren<{ aside?: ReactNode }>) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: theme.ink }]}>{children}</Text>
      {aside}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[]; tone?: 'default' | 'elevated' | 'warm' }>) {
  const theme = useTheme();
  const backgroundColor = tone === 'elevated' ? theme.surfaceElevated : tone === 'warm' ? theme.surfaceWarm : theme.surface;
  return <View style={[styles.card, { backgroundColor, borderColor: theme.borderSoft }, style]}>{children}</View>;
}

// Legacy name retained so existing routes remain stable; visually this is now a quiet tonal surface.
export function GradientCard({ children, style }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  const theme = useTheme();
  return <View style={[styles.card, styles.featureSurface, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

export function Label({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.muted }]}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.subtle}
      selectionColor={theme.ink}
      {...props}
      style={[
        styles.input,
        { backgroundColor: theme.backgroundRaised, borderColor: theme.border, color: theme.ink },
        props.multiline && styles.multiline,
        props.style,
      ]}
    />
  );
}

const wheelRowHeight = 46;
const wheelCycles = 101;

type WheelOption = { label: string; value: number };

function WheelColumn({
  label,
  options,
  value,
  onChange,
  flex = 1,
}: {
  label: string;
  options: WheelOption[];
  value: number;
  onChange: (value: number) => void;
  flex?: number;
}) {
  const theme = useTheme();
  const list = useRef<FlatList<WheelOption>>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const circular = options.length > 1;
  const wheelOptions = useMemo(() => circular ? Array.from({ length: wheelCycles }, () => options).flat() : options, [circular, options]);
  const middleCycle = Math.floor(wheelCycles / 2);
  const initialIndex = circular ? middleCycle * options.length + selectedIndex : selectedIndex;
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndexState] = useState(initialIndex);

  function setActiveIndex(index: number) {
    if (activeIndexRef.current === index) return;
    activeIndexRef.current = index;
    setActiveIndexState(index);
  }

  useEffect(() => {
    const current = wheelOptions[activeIndexRef.current];
    if (current?.value === value) return;

    const nextSelectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    const currentCycle = circular
      ? Math.max(0, Math.min(wheelCycles - 1, Math.floor(activeIndexRef.current / options.length)))
      : 0;
    const nextIndex = circular ? currentCycle * options.length + nextSelectedIndex : nextSelectedIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndexState(nextIndex);
    requestAnimationFrame(() => list.current?.scrollToOffset({ offset: nextIndex * wheelRowHeight, animated: false }));
  }, [circular, options, value, wheelOptions]);

  function rowAtOffset(offset: number) {
    return Math.max(0, Math.min(wheelOptions.length - 1, Math.round(offset / wheelRowHeight)));
  }

  function track(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setActiveIndex(rowAtOffset(event.nativeEvent.contentOffset.y));
  }

  function settle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const rawIndex = rowAtOffset(event.nativeEvent.contentOffset.y);
    setActiveIndex(rawIndex);
    const nextIndex = rawIndex % options.length;
    const next = options[nextIndex];
    if (next && next.value !== value) {
      void Haptics.selectionAsync();
      onChange(next.value);
    }
  }

  return (
    <View style={[styles.wheelColumn, { flex }]} accessibilityLabel={label}>
      <Text style={[styles.wheelLabel, { color: theme.subtle }]}>{label}</Text>
      <FlatList
        ref={list}
        data={wheelOptions}
        keyExtractor={(item, index) => `${index}-${item.value}`}
        initialScrollIndex={initialIndex}
        initialNumToRender={7}
        getItemLayout={(_, index) => ({ length: wheelRowHeight, offset: wheelRowHeight * index, index })}
        snapToInterval={wheelRowHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wheelListContent}
        scrollEventThrottle={16}
        onScroll={track}
        onScrollEndDrag={(event) => {
          const velocity = event.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(velocity) < 0.05) settle(event);
        }}
        onMomentumScrollEnd={settle}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: index === activeIndex }}
            onPress={() => {
              list.current?.scrollToIndex({ index, animated: true });
              setActiveIndex(index);
              void Haptics.selectionAsync();
              onChange(item.value);
            }}
            style={styles.wheelItem}>
            <Text style={[styles.wheelItemText, { color: index === activeIndex ? theme.ink : theme.subtle }]}>{item.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function PickerShell({
  visible,
  title,
  children,
  onCancel,
  onDone,
  onClear,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onCancel: () => void;
  onDone: () => void;
  onClear?: () => void;
}>) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.pickerOverlay, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityLabel="Close picker" style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.pickerPanel, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.pickerTitle, { color: theme.ink }]}>{title}</Text>
          <View style={styles.pickerWheels}>
            <View pointerEvents="none" style={[styles.pickerSelection, { borderColor: theme.border }]} />
            {children}
          </View>
          <View style={styles.pickerActions}>
            {onClear ? (
              <Pressable accessibilityRole="button" onPress={onClear} style={styles.pickerAction}>
                <Text style={[styles.pickerActionText, { color: theme.muted }]}>Clear</Text>
              </Pressable>
            ) : <View />}
            <View style={styles.pickerRightActions}>
              <Pressable accessibilityRole="button" onPress={onCancel} style={styles.pickerAction}>
                <Text style={[styles.pickerActionText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onDone} style={[styles.pickerDone, { backgroundColor: theme.action }]}>
                <Text style={[styles.pickerDoneText, { color: theme.actionText }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function clampDate(date: Date, minimumDate?: Date, maximumDate?: Date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const minimum = minimumDate ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()) : null;
  const maximum = maximumDate ? new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()) : null;
  if (minimum && value < minimum) return minimum;
  if (maximum && value > maximum) return maximum;
  return value;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DateField({
  value,
  onChangeText,
  maximumDate,
  minimumDate,
  placeholder = 'Select a date',
  accessibilityLabel = 'Select date',
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [defaultMaximumDate] = useState(() => new Date());
  const resolvedMaximumDate = maximumDate ?? defaultMaximumDate;
  const selectedDate = clampDate(displayDateToLocalDate(value) ?? resolvedMaximumDate, minimumDate, resolvedMaximumDate);
  const [draft, setDraft] = useState(selectedDate);
  const minimumYear = minimumDate?.getFullYear() ?? 1900;
  const maximumYear = resolvedMaximumDate.getFullYear();
  const draftYear = draft.getFullYear();
  const draftMonth = draft.getMonth();
  const draftDay = draft.getDate();
  const years = useMemo(() => Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => ({ label: String(minimumYear + index), value: minimumYear + index })), [maximumYear, minimumYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ label: new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2020, index, 1)), value: index })).filter(({ value: month }) => {
    if (minimumDate && draftYear === minimumDate.getFullYear() && month < minimumDate.getMonth()) return false;
    if (resolvedMaximumDate && draftYear === resolvedMaximumDate.getFullYear() && month > resolvedMaximumDate.getMonth()) return false;
    return true;
  }), [draftYear, minimumDate, resolvedMaximumDate]);
  const days = useMemo(() => {
    const firstDay = minimumDate && draftYear === minimumDate.getFullYear() && draftMonth === minimumDate.getMonth() ? minimumDate.getDate() : 1;
    const lastDay = resolvedMaximumDate && draftYear === resolvedMaximumDate.getFullYear() && draftMonth === resolvedMaximumDate.getMonth() ? resolvedMaximumDate.getDate() : daysInMonth(draftYear, draftMonth);
    return Array.from({ length: lastDay - firstDay + 1 }, (_, index) => ({ label: String(firstDay + index).padStart(2, '0'), value: firstDay + index }));
  }, [draftMonth, draftYear, minimumDate, resolvedMaximumDate]);

  function changeDraft(year: number, month: number, day: number) {
    const safeDay = Math.min(day, daysInMonth(year, month));
    setDraft(clampDate(new Date(year, month, safeDay), minimumDate, resolvedMaximumDate));
  }

  function openPicker() {
    void Haptics.selectionAsync();
    setDraft(selectedDate);
    setOpen(true);
  }

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value || 'No date selected' }}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.datePickerField,
          { backgroundColor: theme.backgroundRaised, borderColor: theme.border },
          pressed && styles.buttonPressed,
        ]}>
        <Text style={[styles.datePickerText, { color: value ? theme.ink : theme.subtle }]}>{value || placeholder}</Text>
        <Ionicons name="calendar-outline" size={21} color={theme.muted} />
      </Pressable>
      <PickerShell
        visible={open}
        title="Select date"
        onCancel={() => setOpen(false)}
        onClear={value ? () => { onChangeText(''); setOpen(false); } : undefined}
        onDone={() => { onChangeText(localDateToDisplayDate(draft)); setOpen(false); }}>
        <WheelColumn label="Day" options={days} value={draftDay} onChange={(day) => changeDraft(draftYear, draftMonth, day)} />
        <WheelColumn label="Month" options={months} value={draftMonth} flex={1.35} onChange={(month) => changeDraft(draftYear, month, draftDay)} />
        <WheelColumn label="Year" options={years} value={draftYear} flex={1.15} onChange={(year) => changeDraft(year, draftMonth, draftDay)} />
      </PickerShell>
    </View>
  );
}

export function TimeField({
  value,
  onChangeText,
  placeholder = 'Select a time',
  accessibilityLabel = 'Select time',
  allowClear = true,
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  allowClear?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rawMatch = /^(\d{2}):(\d{2})$/.exec(value);
  const match = rawMatch && Number(rawMatch[1]) <= 23 && Number(rawMatch[2]) <= 59 ? rawMatch : null;
  const parsedHour = match ? Number(match[1]) : 9;
  const [hour, setHour] = useState(parsedHour % 12 || 12);
  const [minute, setMinute] = useState(match ? Number(match[2]) : 0);
  const [period, setPeriod] = useState(parsedHour >= 12 ? 1 : 0);
  const hours = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ label: String(index + 1).padStart(2, '0'), value: index + 1 })), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, index) => ({ label: String(index).padStart(2, '0'), value: index })), []);
  const periods = useMemo(() => [{ label: 'AM', value: 0 }, { label: 'PM', value: 1 }], []);
  const displayValue = match
    ? `${parsedHour % 12 || 12}:${String(Number(match[2])).padStart(2, '0')} ${parsedHour >= 12 ? 'PM' : 'AM'}`
    : '';

  function openPicker() {
    if (match) {
      const nextHour = Number(match[1]);
      setHour(nextHour % 12 || 12);
      setMinute(Number(match[2]));
      setPeriod(nextHour >= 12 ? 1 : 0);
    }
    void Haptics.selectionAsync();
    setOpen(true);
  }

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: displayValue || 'No time selected' }}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.datePickerField,
          { backgroundColor: theme.backgroundRaised, borderColor: theme.border },
          pressed && styles.buttonPressed,
        ]}>
        <Text style={[styles.datePickerText, { color: value ? theme.ink : theme.subtle }]}>{displayValue || placeholder}</Text>
        <Ionicons name="time-outline" size={21} color={theme.muted} />
      </Pressable>
      <PickerShell
        visible={open}
        title="Select time"
        onCancel={() => setOpen(false)}
        onClear={allowClear && value ? () => { onChangeText(''); setOpen(false); } : undefined}
        onDone={() => {
          const hour24 = period === 0 ? hour % 12 : (hour % 12) + 12;
          onChangeText(`${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
          setOpen(false);
        }}>
        <WheelColumn label="Hour" options={hours} value={hour} onChange={setHour} flex={0.9} />
        <Text style={[styles.timeSeparator, { color: theme.ink }]}>:</Text>
        <WheelColumn label="Minute" options={minutes} value={minute} onChange={setMinute} flex={0.9} />
        <WheelColumn label="Period" options={periods} value={period} onChange={setPeriod} flex={0.75} />
      </PickerShell>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  const foreground = kind === 'primary' ? theme.actionText : kind === 'danger' ? theme.danger : theme.ink;
  const background = kind === 'primary' ? theme.action : kind === 'danger' ? theme.dangerSoft : kind === 'secondary' ? theme.surfaceElevated : 'transparent';
  const border = kind === 'primary' ? theme.action : kind === 'danger' ? theme.danger : theme.border;
  const disabledProgress = useSharedValue(disabled ? 1 : 0);

  useEffect(() => {
    disabledProgress.value = withTiming(disabled ? 1 : 0, { duration: 190 });
  }, [disabled, disabledProgress]);

  const disabledStyle = useAnimatedStyle(() => ({
    opacity: 1 - disabledProgress.value * 0.38,
  }));

  function handlePress() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Animated.View layout={LinearTransition.duration(190).reduceMotion(ReduceMotion.System)} style={disabledStyle}>
      <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: border },
        pressed && styles.buttonPressed,
      ]}>
      {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
        <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function InlineRequirement({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(170).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(170).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(190).reduceMotion(ReduceMotion.System)}>
      <Text accessibilityLiveRegion="polite" style={[styles.inlineRequirement, { color: theme.muted }]}>{children}</Text>
    </Animated.View>
  );
}

export function IconButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.iconButton, { borderColor: theme.border, backgroundColor: theme.surface }, (pressed || disabled) && styles.buttonPressed]}>
      <Ionicons name={icon} size={20} color={theme.ink} />
    </Pressable>
  );
}

export function BackButton({ label = 'Back' }: { label?: string }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.buttonPressed]}>
      <Ionicons name="arrow-back" size={19} color={theme.ink} />
      <Text style={[styles.backText, { color: theme.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function ChoiceRow({ options, value, onChange }: { options: { label: string; value: number | string }[]; value: number | string; onChange: (value: never) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.choiceRow} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => { void Haptics.selectionAsync(); onChange(option.value as never); }}
            style={({ pressed }) => [
              styles.choice,
              { borderColor: selected ? theme.ink : theme.border, backgroundColor: selected ? theme.ink : theme.backgroundRaised },
              pressed && styles.buttonPressed,
            ]}>
            {selected ? <SelectionFade><Ionicons name="checkmark" size={15} color={theme.invertedInk} /></SelectionFade> : null}
            <Text style={[styles.choiceText, { color: selected ? theme.invertedInk : theme.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={styles.progressRow} accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.progressSegment, { backgroundColor: index < current ? theme.ink : theme.border }]} />
      ))}
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'accent' | 'success' }>) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.success : tone === 'accent' ? theme.invertedInk : theme.muted;
  const backgroundColor = tone === 'accent' ? theme.ink : tone === 'success' ? theme.primarySoft : theme.white08;
  return <Text style={[styles.pill, { color, backgroundColor }]}>{children}</Text>;
}

export function EmptyState({ children, icon = 'moon-outline' }: PropsWithChildren<{ icon?: keyof typeof Ionicons.glyphMap }>) {
  const theme = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={25} color={theme.subtle} />
      <Text style={[styles.empty, { color: theme.muted }]}>{children}</Text>
    </View>
  );
}

export function LoadingState({ message = 'Opening your private recovery space...' }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.ink} size="small" />
      <Text style={[styles.loadingTitle, { color: theme.ink }]}>Fistula Tracker</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

export function Row({ children, right }: PropsWithChildren<{ right?: ReactNode }>) {
  return <View style={styles.row}><View style={styles.rowContent}>{children}</View>{right}</View>;
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, overflow: 'hidden' },
  screenContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 116, flexGrow: 1 },
  screenInner: { gap: spacing.md },
  emphasisEditorial: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 54, letterSpacing: -0.8 },
  serifGuard: { fontFamily: fonts.serif },
  emphasisItalic: { fontFamily: fonts.serifItalic, fontWeight: '400' },
  heading: { gap: spacing.xs, marginBottom: spacing.xs },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  h1Serif: { fontFamily: fonts.serif, fontSize: 43, lineHeight: 51, letterSpacing: -1.15 },
  subtitle: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md, overflow: 'hidden' },
  featureSurface: { borderRadius: radii.xl, padding: spacing.lg },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 18, minHeight: 56 },
  datePickerField: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 16, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  datePickerText: { flex: 1, fontFamily: fonts.regular, fontSize: 18, lineHeight: 24 },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22 },
  pickerPanel: { width: '100%', maxWidth: 390, borderRadius: radii.xl, borderWidth: 1, padding: 20, gap: 15 },
  pickerTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 39 },
  pickerWheels: { height: 176, flexDirection: 'row', alignItems: 'flex-end', position: 'relative' },
  pickerSelection: { position: 'absolute', left: 0, right: 0, top: 84, height: wheelRowHeight, borderTopWidth: 1, borderBottomWidth: 1 },
  wheelColumn: { height: 176 },
  wheelLabel: { height: 38, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  wheelListContent: { paddingVertical: wheelRowHeight },
  wheelItem: { height: wheelRowHeight, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 23 },
  timeSeparator: { width: 18, height: wheelRowHeight, marginBottom: wheelRowHeight, textAlign: 'center', textAlignVertical: 'center', fontFamily: fonts.serif, fontSize: 27, lineHeight: wheelRowHeight },
  pickerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 2 },
  pickerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  pickerActionText: { fontFamily: fonts.medium, fontSize: 16 },
  pickerDone: { minHeight: 44, justifyContent: 'center', borderRadius: 13, paddingHorizontal: 20 },
  pickerDoneText: { fontFamily: fonts.semibold, fontSize: 16 },
  multiline: { minHeight: 122, textAlignVertical: 'top', paddingTop: 15 },
  button: { borderRadius: radii.md, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: spacing.md, borderWidth: 1 },
  buttonPressed: { opacity: 0.62 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  inlineRequirement: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  iconButton: { width: 46, height: 46, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingRight: 12, minHeight: 44 },
  backText: { fontFamily: fonts.medium, fontSize: 16 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 17, paddingVertical: 12, minHeight: 50 },
  choiceText: { fontFamily: fonts.medium, fontSize: 16 },
  smoothSwitchHitbox: { width: 56, height: 44, alignItems: 'center', justifyContent: 'center' },
  smoothSwitchTrack: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  smoothSwitchThumb: { width: 22, height: 22, borderRadius: 11 },
  progressRow: { flexDirection: 'row', gap: 5, width: '100%' },
  progressSegment: { height: 2, borderRadius: 2, flex: 1 },
  pill: { fontFamily: fonts.semibold, fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.round, overflow: 'hidden' },
  emptyWrap: { alignItems: 'center', gap: 13, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  empty: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingTitle: { fontFamily: fonts.serif, fontSize: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowContent: { flex: 1, gap: 4 },
  divider: { height: 1 },
});

export const commonStyles = styles;
