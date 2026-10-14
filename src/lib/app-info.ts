import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { FeedbackDetails } from './feedback';

export function getAppDetails(): FeedbackDetails {
  const config = Constants.expoConfig;
  return {
    version: config?.version ?? 'Unknown',
    build: String(Platform.OS === 'android' ? config?.android?.versionCode ?? 'Unknown' : config?.ios?.buildNumber ?? 'Unknown'),
    platform: Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web',
    systemVersion: Platform.OS === 'android' ? Platform.constants.Release : String(Platform.Version ?? 'Unknown'),
  };
}
