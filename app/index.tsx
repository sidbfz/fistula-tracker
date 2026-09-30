import { Redirect } from 'expo-router';

import { useApp } from '@/src/context/app-context';

export default function Index() {
  const { onboardingComplete, profile } = useApp();
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!profile) return <Redirect href="/setup" />;
  return <Redirect href="/(tabs)" />;
}
