import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkerGrotesque_500Medium } from '@expo-google-fonts/darker-grotesque/500Medium';
import { DarkerGrotesque_600SemiBold } from '@expo-google-fonts/darker-grotesque/600SemiBold';
import { DarkerGrotesque_700Bold } from '@expo-google-fonts/darker-grotesque/700Bold';
import { DarkerGrotesque_800ExtraBold } from '@expo-google-fonts/darker-grotesque/800ExtraBold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { Button, fonts, useTheme } from '@/src/components/ui';
import { AppProvider, useApp } from '@/src/context/app-context';
import { configureRevenueCat } from '@/src/lib/revenuecat';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const theme = useTheme();
  const { ready, error, biometricEnabled, unlocked, unlock } = useApp();
  const segments = useSegments();
  const [hasLaidOut, setHasLaidOut] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const splashHidden = useRef(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;

  const routeReady = segments.length > 0;
  const contentReady = fontsLoaded && ready && (Boolean(error) || (biometricEnabled && !unlocked) || routeReady);

  const finishSplashTransition = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => undefined);

    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (reduceMotion) {
      splashOpacity.setValue(0);
      setShowSplashOverlay(false);
      return;
    }

    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(splashScale, {
        toValue: 0.965,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setShowSplashOverlay(false));
  }, [splashOpacity, splashScale]);

  useEffect(() => {
    if (!contentReady || !hasLaidOut || splashHidden.current) return;

    splashHidden.current = true;
    requestAnimationFrame(() => {
      void finishSplashTransition();
    });
  }, [contentReady, finishSplashTransition, hasLaidOut]);

  const handleLayout = useCallback(() => {
    setHasLaidOut(true);
  }, []);

  if (!fontsLoaded || !ready) return null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} onLayout={handleLayout}>
      {error ? (
        <View style={styles.center}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}><Ionicons name="alert-circle-outline" size={26} color={theme.danger} /></View>
          <Text style={[styles.title, { color: theme.ink }]}>Your space could not be opened</Text>
          <Text style={[styles.body, { color: theme.muted }]}>{error}</Text>
        </View>
      ) : biometricEnabled && !unlocked ? (
        <View style={styles.center}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}><Ionicons name="lock-closed" size={25} color={theme.ink} /></View>
          <Text style={[styles.title, { color: theme.ink }]}>Your recovery is private</Text>
          <Text style={[styles.body, { color: theme.muted }]}>Authenticate with your device to return to your recovery space.</Text>
          <View style={styles.buttonWidth}><Button title="Unlock Fistula Tracker" icon="finger-print" onPress={() => void unlock()} /></View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
      )}
      <StatusBar style={showSplashOverlay ? 'dark' : theme.isDark ? 'light' : 'dark'} />
      {showSplashOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.splashOverlay, { opacity: splashOpacity }]}
        >
          <Animated.View style={{ transform: [{ scale: splashScale }] }}>
            <Image source={require('../assets/images/splash-icon.png')} style={styles.splashLogo} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DarkerGrotesque_500Medium,
    DarkerGrotesque_600SemiBold,
    DarkerGrotesque_700Bold,
    DarkerGrotesque_800ExtraBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    ...Ionicons.font,
  });

  useEffect(() => {
    // A missing purchase key never blocks the local recovery experience.
    void configureRevenueCat().catch(() => undefined);
  }, []);

  return (
    <AppProvider>
      <AppGate fontsLoaded={fontsLoaded} />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F1EB' },
  splashLogo: { width: 200, height: 200 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  iconBox: { width: 60, height: 60, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 6 },
  title: { fontSize: 34, lineHeight: 38, textAlign: 'center', fontFamily: fonts.serif },
  body: { fontSize: 17, lineHeight: 24, textAlign: 'center', marginBottom: 8, fontFamily: fonts.regular, maxWidth: 340 },
  buttonWidth: { width: '100%', maxWidth: 340 },
});
