import { Platform } from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

export const SUPPORTER_ENTITLEMENT_ID = 'supporter';

export type SupportCatalog = {
  oneTimeSupport: PurchasesPackage | null;
  supporter: boolean;
};

let configurationPromise: Promise<boolean> | null = null;

function platformApiKey() {
  const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim();
  if (__DEV__ && testKey) return testKey;
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  return undefined;
}

export function revenueCatKeyIsPresent() {
  return Boolean(platformApiKey());
}

export function configureRevenueCat() {
  if (configurationPromise) return configurationPromise;

  configurationPromise = (async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
    const apiKey = platformApiKey();
    if (!apiKey) return false;

    if (!(await Purchases.isConfigured())) {
      // Omitting appUserID makes RevenueCat create a random anonymous ID.
      Purchases.configure({ apiKey });
    }
    return true;
  })().catch((reason) => {
    configurationPromise = null;
    throw reason;
  });

  return configurationPromise;
}

export function hasSupporterEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[SUPPORTER_ENTITLEMENT_ID]?.isActive);
}

export async function loadSupportCatalog(): Promise<SupportCatalog> {
  const configured = await configureRevenueCat();
  if (!configured) throw new Error('Support purchases have not been configured for this build yet.');

  const [offerings, customerInfo] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);
  const packages = offerings.current?.availablePackages ?? [];

  return {
    oneTimeSupport: packages.find((item) => item.packageType === PACKAGE_TYPE.LIFETIME) ?? null,
    supporter: hasSupporterEntitlement(customerInfo),
  };
}

export async function purchaseSupportPackage(item: PurchasesPackage) {
  const result = await Purchases.purchasePackage(item);
  return result.customerInfo;
}

export async function restoreSupporterPurchase() {
  return Purchases.restorePurchases();
}

export function purchaseWasCancelled(reason: unknown) {
  const error = reason as Partial<PurchasesError> | null;
  return error?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || error?.userCancelled === true;
}

export function purchaseErrorMessage(reason: unknown) {
  const error = reason as Partial<PurchasesError> | null;
  if (error?.code === Purchases.PURCHASES_ERROR_CODE.NETWORK_ERROR || error?.code === Purchases.PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR) {
    return 'Connect to the internet and try again. Your recovery tools still work offline.';
  }
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  if (reason instanceof Error && reason.message.trim()) return reason.message;
  return 'The store could not complete this purchase. Please try again.';
}
