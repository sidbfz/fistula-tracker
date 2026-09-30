import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, fonts, Heading, Screen, useTheme } from '@/src/components/ui';
import {
  hasSupporterEntitlement,
  loadSupportCatalog,
  purchaseErrorMessage,
  purchaseSupportPackage,
  purchaseWasCancelled,
  restoreSupporterPurchase,
  revenueCatKeyIsPresent,
  type SupportCatalog,
} from '@/src/lib/revenuecat';

type BusyAction = 'purchase' | 'restore' | null;

export default function SupportScreen() {
  const theme = useTheme();
  const [catalog, setCatalog] = useState<SupportCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await loadSupportCatalog());
    } catch (reason) {
      setError(purchaseErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function purchase() {
    if (!catalog?.oneTimeSupport) return;
    setBusy('purchase');
    setError(null);
    setNotice(null);
    try {
      const customerInfo = await purchaseSupportPackage(catalog.oneTimeSupport);
      const supporter = hasSupporterEntitlement(customerInfo);
      setCatalog((current) => current ? { ...current, supporter } : current);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotice(supporter
        ? 'Thank you. Your one-time support is confirmed.'
        : 'The purchase completed, but supporter status is still updating. Try Restore Purchase in a moment.');
    } catch (reason) {
      if (!purchaseWasCancelled(reason)) setError(purchaseErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy('restore');
    setError(null);
    setNotice(null);
    try {
      const customerInfo = await restoreSupporterPurchase();
      const supporter = hasSupporterEntitlement(customerInfo);
      setCatalog((current) => current ? { ...current, supporter } : current);
      setNotice(supporter
        ? 'Your one-time support purchase has been restored.'
        : 'No one-time support purchase was found for this store account.');
    } catch (reason) {
      setError(purchaseErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <BackButton label="More" />
      <Heading
        serif
        eyebrow="OPTIONAL SUPPORT"
        title="Keep this space gentle and accessible."
        subtitle="Every recovery feature stays free. Supporting the app helps with maintenance, store costs, and thoughtful improvements."
      />

      <View style={[styles.promise, { backgroundColor: theme.feature }]}>
        <Ionicons name="heart-outline" size={24} color={theme.featureInk} />
        <Text style={[styles.promiseTitle, { color: theme.featureInk }]}>Care is never the paywall.</Text>
        <Text style={[styles.promiseBody, { color: theme.featureMuted }]}>Medicines, reminders, check-ins, Journal, photos, routines, privacy, and data controls remain available whether or not you purchase.</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.ink} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Checking the store…</Text>
        </View>
      ) : (
        <View style={[styles.purchaseCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.purchaseHeader}>
            <View style={[styles.purchaseIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={catalog?.supporter ? 'checkmark' : 'sparkles-outline'} size={21} color={theme.ink} />
            </View>
            <View style={styles.purchaseCopy}>
              <Text style={[styles.purchaseTitle, { color: theme.ink }]}>One-time support</Text>
              <Text style={[styles.purchaseBody, { color: theme.muted }]}>{catalog?.supporter ? 'Thank you for supporting Fistula Tracker.' : 'A single optional purchase. No subscription, and every recovery feature stays free.'}</Text>
            </View>
          </View>

          {catalog?.supporter ? (
            <View style={[styles.active, { borderColor: theme.success }]}>
              <Ionicons name="checkmark-circle" size={19} color={theme.success} />
              <Text style={[styles.activeText, { color: theme.success }]}>Support confirmed</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !catalog?.oneTimeSupport || busy !== null }}
              disabled={!catalog?.oneTimeSupport || busy !== null}
              onPress={() => void purchase()}
              style={({ pressed }) => [styles.purchaseButton, { backgroundColor: theme.action }, (pressed || !catalog?.oneTimeSupport || busy !== null) && styles.pressed]}>
              <Text style={[styles.purchaseButtonText, { color: theme.actionText }]}>{busy === 'purchase'
                ? 'Opening the store…'
                : catalog?.oneTimeSupport
                  ? `Support once · ${catalog.oneTimeSupport.product.priceString}`
                  : 'One-time support unavailable'}</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.actionText} />
            </Pressable>
          )}
        </View>
      )}

      {notice ? (
        <View accessibilityLiveRegion="polite" style={[styles.message, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="heart" size={17} color={theme.ink} />
          <Text style={[styles.messageText, { color: theme.ink }]}>{notice}</Text>
        </View>
      ) : null}
      {error ? (
        <View accessibilityLiveRegion="polite" style={[styles.message, { backgroundColor: theme.dangerSoft }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.danger} />
          <View style={styles.messageCopy}>
            <Text style={[styles.messageText, { color: theme.danger }]}>{error}</Text>
            {__DEV__ && !revenueCatKeyIsPresent() ? <Text style={[styles.devHint, { color: theme.muted }]}>Add a RevenueCat public SDK key to .env.local, then restart Expo.</Text> : null}
            {revenueCatKeyIsPresent() ? (
              <Pressable accessibilityRole="button" onPress={() => void load()} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={[styles.retryText, { color: theme.danger }]}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {!loading && catalog && !catalog.supporter ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy !== null }} disabled={busy !== null} onPress={() => void restore()} style={({ pressed }) => [styles.restore, (pressed || busy !== null) && styles.pressed]}>
          {busy === 'restore' ? <ActivityIndicator size="small" color={theme.muted} /> : <Ionicons name="refresh-outline" size={17} color={theme.muted} />}
          <Text style={[styles.restoreText, { color: theme.muted }]}>{busy === 'restore' ? 'Restoring…' : 'Supported before? Restore purchase'}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.privacy, { borderTopColor: theme.borderSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={19} color={theme.subtle} />
        <Text style={[styles.privacyText, { color: theme.muted }]}>Purchases are handled by your app store and RevenueCat using an anonymous purchase identifier. Your recovery entries, medicines, Journal, and photos are never sent with a purchase.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promise: { borderRadius: 25, padding: 22, gap: 8 },
  promiseTitle: { fontFamily: fonts.serifItalic, fontSize: 31, lineHeight: 38 },
  promiseBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  loading: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 11 },
  loadingText: { fontFamily: fonts.medium, fontSize: 15 },
  purchaseCard: { borderWidth: 1, borderRadius: 21, padding: 18, gap: 17 },
  purchaseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  purchaseIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  purchaseCopy: { flex: 1, gap: 4 },
  purchaseTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 25 },
  purchaseBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  purchaseButton: { minHeight: 55, borderRadius: 15, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  purchaseButtonText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  active: { minHeight: 49, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activeText: { fontFamily: fonts.semibold, fontSize: 16 },
  message: { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  messageCopy: { flex: 1, gap: 4 },
  messageText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  devHint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  retryText: { alignSelf: 'flex-start', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, textDecorationLine: 'underline', paddingTop: 3 },
  restore: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  restoreText: { fontFamily: fonts.medium, fontSize: 15, textDecorationLine: 'underline' },
  privacy: { borderTopWidth: 1, paddingTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  pressed: { opacity: 0.55 },
});
