import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { getProfile, getSetting, initializeDatabase, listReminders, setSetting, updateReminder } from '@/src/lib/db';
import { cancelReminder } from '@/src/lib/notifications';
import type { RecoveryProfile } from '@/src/types';

type AppContextValue = {
  ready: boolean;
  error: string | null;
  onboardingComplete: boolean;
  biometricEnabled: boolean;
  darkModeEnabled: boolean;
  unlocked: boolean;
  displayName: string;
  profile: RecoveryProfile | null;
  refresh: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setDarkModeEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => Promise<boolean>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [biometricEnabled, setBiometricState] = useState(false);
  const [darkModeEnabled, setDarkModeState] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [displayName, setDisplayNameState] = useState('');
  const [profile, setProfile] = useState<RecoveryProfile | null>(null);

  const refresh = useCallback(async () => {
    const [onboarding, biometric, colorScheme, name, savedProfile] = await Promise.all([
      getSetting('onboarding_complete'),
      getSetting('biometric_enabled'),
      getSetting('app_color_scheme'),
      getSetting('display_name'),
      getProfile(),
    ]);
    const savedColorScheme = colorScheme === 'dark' || colorScheme === 'light' ? colorScheme : 'light';
    Appearance.setColorScheme(savedColorScheme);
    setOnboardingComplete(onboarding === 'true');
    setBiometricState(biometric === 'true');
    setDarkModeState(savedColorScheme === 'dark');
    setDisplayNameState(name ?? '');
    setProfile(savedProfile);
  }, []);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Fistula Tracker',
      promptDescription: 'Your recovery information is private.',
      fallbackLabel: 'Use device passcode',
    });
    setUnlocked(result.success);
    return result.success;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        const enabled = (await getSetting('biometric_enabled')) === 'true';
        await refresh();
        if (enabled) {
          setUnlocked(false);
          await unlock();
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to open local storage.');
      } finally {
        setReady(true);
      }
    })();
  }, [refresh, unlock]);

  useEffect(() => {
    if (!ready || error) return;

    // Medication reminders now belong to individual medicines. Retire the
    // legacy one-size-fits-all reminder without delaying the first screen.
    void (async () => {
      const legacyMedication = (await listReminders()).find((reminder) => reminder.kind === 'medication');
      if (!legacyMedication) return;
      await cancelReminder(legacyMedication.notification_id);
      await updateReminder('medication', false, legacyMedication.time, null);
    })().catch(() => undefined);
  }, [error, ready]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (biometricEnabled && previous.match(/inactive|background/) && next === 'active') {
        setUnlocked(false);
        void unlock();
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [biometricEnabled, unlock]);

  const finishOnboarding = useCallback(async () => {
    await setSetting('onboarding_complete', 'true');
    setOnboardingComplete(true);
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const cleanName = name.trim();
    await setSetting('display_name', cleanName);
    setDisplayNameState(cleanName);
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) throw new Error('Set up device biometrics or a device lock first.');
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable app lock' });
      if (!result.success) throw new Error('Authentication was cancelled or unsuccessful.');
    }
    await setSetting('biometric_enabled', enabled ? 'true' : 'false');
    setBiometricState(enabled);
    setUnlocked(true);
  }, []);

  const setDarkModeEnabled = useCallback(async (enabled: boolean) => {
    const colorScheme = enabled ? 'dark' : 'light';
    await setSetting('app_color_scheme', colorScheme);
    Appearance.setColorScheme(colorScheme);
    setDarkModeState(enabled);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      error,
      onboardingComplete,
      biometricEnabled,
      darkModeEnabled,
      unlocked,
      displayName,
      profile,
      refresh,
      finishOnboarding,
      setDisplayName,
      setBiometricEnabled,
      setDarkModeEnabled,
      unlock,
    }),
    [ready, error, onboardingComplete, biometricEnabled, darkModeEnabled, unlocked, displayName, profile, refresh, finishOnboarding, setDisplayName, setBiometricEnabled, setDarkModeEnabled, unlock],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
