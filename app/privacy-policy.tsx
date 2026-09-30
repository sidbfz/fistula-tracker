import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, fonts, Heading, Screen, useTheme } from '@/src/components/ui';

const sections = [
  {
    title: 'Summary',
    body: 'Your recovery information is stored locally on your device. Fistula Tracker does not require an account and does not operate a server that receives your recovery records.\n\nThe app does not include advertising or behavioural analytics. The developer does not sell personal information.\n\nTo make the optional one-time support purchase available, Fistula Tracker uses Google Play and RevenueCat. These services process limited technical and purchase-related information needed to display, validate, restore and maintain the purchase.',
  },
  {
    title: 'Information You Choose to Store',
    body: 'You may choose to enter a name or nickname; recovery stage and surgery or procedure details; symptom and daily check-in records; medicine names, schedules, and medication events; recovery routines and reminders; Journal entries and recovery goals; and wound or recovery photographs. This information may include personal and sensitive health information. Optional fields can be left blank.',
  },
  {
    title: 'How Recovery Information Is Used',
    body: 'The app uses the information you enter to provide features you choose, including displaying your recovery history, organizing medicines and routines, scheduling local reminders, keeping Journal entries, and displaying your private photo timeline.\n\nFistula Tracker does not use recovery information to diagnose a condition, assess a wound, recommend treatment or medication doses, advertise to you, profile you, or train artificial-intelligence models.',
  },
  {
    title: 'Local Storage and Sharing',
    body: "Structured recovery records are stored in a local SQLite database. Photographs selected or captured through the app are copied into the app's private document storage.\n\nThe developer does not receive or have access to your recovery records. Fistula Tracker does not send your name, medical history, procedure details, medicines, routines, check-ins, Journal entries, reminder content, recovery goals, or photographs to RevenueCat, advertisers, analytics providers, data brokers, healthcare providers, or a developer-operated server.\n\nYour operating system or a backup service that you enable may include app data in a device backup. Such backups are controlled by you and the applicable platform or backup provider.",
  },
  {
    title: 'Camera and Photo Library',
    body: "Camera or photo-library permission is requested only when you choose to take or select a recovery photograph. The selected image is copied into private app storage. The app does not scan the rest of your photo library or upload selected photographs to a developer-operated server.",
  },
  {
    title: 'Notifications',
    body: 'If you enable reminders, Fistula Tracker asks the operating system to schedule notifications using the times and wording you select. These are local, on-device notifications. You can disable individual reminders inside the app or disable all notifications through your device settings.\n\nMedicine, routine, and check-in reminders are organizational tools only and do not constitute medical advice.',
  },
  {
    title: 'Device Authentication',
    body: 'If you enable App Lock, authentication is performed by your device. Fistula Tracker receives only whether authentication succeeded. The app does not receive or store your fingerprint, facial image, passcode, or other biometric information.',
  },
  {
    title: 'Google Play and RevenueCat',
    body: 'Fistula Tracker offers an optional one-time support purchase. The purchase does not unlock or restrict medically relevant recovery features.\n\nGoogle Play processes the payment and maintains the store transaction. RevenueCat is used to:\n\n• Retrieve product availability and pricing\n• Validate the purchase\n• Restore an existing purchase\n• Maintain purchase entitlement status\n• Provide purchase-related analytics\n\nTo provide this functionality, Fistula Tracker initialises RevenueCat using a randomly generated anonymous app-user identifier. This may occur when the app starts, even if you do not complete a purchase.\n\nRevenueCat may process:\n\n• An anonymous app-user identifier\n• Device type and operating system\n• App and store information\n• Last-seen time\n• Product and purchase history\n• Google Play purchase tokens\n• Transaction status\n• Entitlement status\n\nFistula Tracker does not intentionally associate recovery records, photographs or other health information with RevenueCat purchase data.\n\nPurchase history is collected for app functionality and purchase-related analytics. It is not used for advertising or cross-app tracking.\n\nGoogle Play and RevenueCat process information under their respective privacy policies:\n\n• https://policies.google.com/privacy\n• https://www.revenuecat.com/privacy-policy',
  },
  {
    title: 'Data Retention and Deletion',
    body: 'Recovery information remains on your device until you edit or delete it, clear the app’s storage, or uninstall the app, subject to device backups that you control.\n\nYou can delete locally stored information from within Fistula Tracker:\n\n1. Open More.\n2. Open Settings.\n3. Scroll to Data.\n4. Select Delete recovery history, Delete all photos, or Delete all app data.\n\nDeleting all app data erases locally stored Fistula Tracker information and returns the app to its opening setup.\n\nREQUEST DELETION OF PURCHASE-RELATED DATA\n\nTo request deletion of purchase-related information processed through RevenueCat, email fistulatracker@gmail.com with the subject “Fistula Tracker data deletion request”.\n\nInclude your Google Play order number and approximate purchase date so that the relevant transaction can be located. Do not include recovery information, medical records or photographs in your email.\n\nVerified deletion requests will normally be processed within 30 days. The associated RevenueCat customer record will be submitted for deletion.\n\nDeleting information from RevenueCat does not delete transaction or financial records maintained independently by Google Play. Google or other service providers may retain records where required for legal, accounting, security, dispute-resolution or fraud-prevention purposes under their respective policies.\n\nIf an existing purchase is subsequently restored or validated through Google Play, a corresponding anonymous RevenueCat customer record may be created again.',
  },
  {
    title: 'Security',
    body: 'Fistula Tracker relies on the security protections provided by your device and operating system, including app-private storage and optional device authentication. No storage method can be guaranteed to be completely secure. Keep your device updated and protected with a passcode.',
  },
  {
    title: 'Children',
    body: 'Fistula Tracker is intended for adults and is not specifically directed to children.\n\nThe developer does not knowingly collect children’s recovery information through a developer-operated service.',
  },
  {
    title: 'Medical and Emergency Disclaimer',
    body: 'Fistula Tracker is a personal record and reminder tool, not a medical device or healthcare service. It does not diagnose conditions, detect infection, prescribe care, recommend medication doses, or replace a qualified healthcare professional. Do not rely on the app during an emergency; contact local emergency services or an appropriate clinician.',
  },
  {
    title: 'Changes to This Policy',
    body: 'This policy may be updated when the app’s features or privacy practices change. The updated policy will show a revised “Last updated” date. Material changes will be reflected in the app and on the publicly available policy page as appropriate.',
  },
  {
    title: 'Contact',
    body: 'Developer: Siddharth Farkade\nEmail: fistulatracker@gmail.com\n\nFor privacy questions or data-related requests concerning Fistula Tracker, contact the developer at the email address above.',
  },
] as const;

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <BackButton label="Settings" />
      <Heading title="Privacy Policy" subtitle="Clear language about what stays private and how this app works." />

      <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={25} color={theme.ink} />
        <Text style={[styles.summaryTitle, { color: theme.ink }]}>Your recovery data stays on your device.</Text>
        <Text style={[styles.updated, { color: theme.subtle }]}>Last updated September 20, 2026</Text>
      </View>

      <View style={styles.sections}>
        {sections.map((section, index) => (
          <View key={section.title} style={[styles.section, index > 0 && { borderTopColor: theme.borderSoft, borderTopWidth: 1 }]}>
            <Text style={[styles.title, { color: theme.ink }]}>{section.title}</Text>
            <Text style={[styles.body, { color: theme.muted }]}>{section.body}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.finalNote, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.finalTitle, { color: theme.ink }]}>No hidden collection.</Text>
        <Text style={[styles.body, { color: theme.muted }]}>Fistula Tracker does not transmit recovery information. Optional purchase-related data is processed only by Google Play and RevenueCat for purchase availability, validation, restoration, and entitlement status.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 20, padding: 19, gap: 7 },
  summaryTitle: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 36 },
  updated: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  sections: { gap: 0 },
  section: { paddingVertical: 20, gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  finalNote: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 7, marginBottom: 8 },
  finalTitle: { fontFamily: fonts.serifItalic, fontSize: 27, lineHeight: 34 },
});
