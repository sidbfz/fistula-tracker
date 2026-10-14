export const PRIVACY_POLICY_UPDATED = 'October 14, 2026';

export const privacyPolicySections = [
  {
    "title": "Summary",
    "body": "Your recovery information is stored locally on your device. Fistula Tracker does not require an account and does not operate a server that receives your recovery records.\n\nFrom version 1.0.3, every feature is free. This version contains no advertising, analytics SDK, RevenueCat SDK or in-app purchases. The developer does not sell personal information."
  },
  {
    "title": "Information You Choose to Store",
    "body": "You may choose to enter a name or nickname; recovery stage and surgery or procedure details; symptom and daily check-in records; medicine names, schedules and medication events; recovery routines and reminders; journal entries and recovery goals; and wound or recovery photographs. This information may include personal and sensitive health information. Optional fields can be left blank."
  },
  {
    "title": "How Recovery Information Is Used",
    "body": "The app uses the information you enter to provide features you choose, including displaying your recovery history, organizing medicines and routines, scheduling local reminders, keeping journal entries and displaying your private photo timeline.\n\nFistula Tracker does not use recovery information to diagnose a condition, assess a wound, recommend treatment or medication doses, advertise to you, profile you or train artificial-intelligence models."
  },
  {
    "title": "Local Storage and Sharing",
    "body": "Structured recovery records are stored in a local SQLite database. Photographs selected or captured through the app are copied into the app's private document storage.\n\nThe developer does not automatically receive or have access to your recovery records. The app does not upload your name, medical history, procedure details, medicines, routines, check-ins, journal entries, reminders, recovery goals or photographs to a developer-operated server or third-party SDK.\n\nYour operating system or a backup service that you enable may include app data in a device backup. Such backups are controlled by you and the applicable platform or backup provider."
  },
  {
    "title": "Camera and Photo Library",
    "body": "Camera or photo-library permission is requested only when you choose to take or select a recovery photograph. The selected image is copied into private app storage. The app does not scan the rest of your photo library or upload selected photographs to a developer-operated server."
  },
  {
    "title": "Notifications",
    "body": "If you enable reminders, Fistula Tracker asks the operating system to schedule notifications using the times and wording you select. These are local, on-device notifications. You can disable individual reminders inside the app or disable all notifications through your device settings.\n\nMedicine, routine and check-in reminders are organizational tools only and do not constitute medical advice."
  },
  {
    "title": "Device Authentication",
    "body": "If you enable App Lock, authentication is performed by your device. Fistula Tracker receives only whether authentication succeeded. The app does not receive or store your fingerprint, facial image, passcode or other biometric information."
  },
  {
    "title": "Optional Email Feedback",
    "body": "Send feedback opens an editable draft in your chosen email app. The draft contains only the app version, build number, operating system name and operating system version, plus blank prompts for describing a problem. No recovery records, screenshots, photos, logs, anonymous app-user IDs or device identifiers are attached automatically.\n\nNo email is sent automatically. If you choose to send it, your email provider processes the message and the developer receives your email address, message and any information or attachments you choose to include. Please do not include medical information or private photographs.\n\nFeedback is used to respond to your request and improve the app, not for advertising. Correspondence is kept as needed to handle the request and related follow-up. You may request deletion by emailing fistulatracker@gmail.com; verified requests will normally be handled within 30 days, subject to any applicable legal retention requirement."
  },
  {
    "title": "Earlier Versions and Purchase Records",
    "body": "Versions up to 1.0.2 included an optional one-time supporter purchase through Google Play and RevenueCat. Those versions could send RevenueCat an anonymous app-user identifier, app and device information, and purchase or entitlement details, even if no purchase was completed. Recovery records and photographs were not attached to purchase information.\n\nVersion 1.0.3 removes the purchase flow and RevenueCat integration. It does not send new purchase information to RevenueCat, but upgrading does not automatically delete records already held by RevenueCat or Google Play. Older installed versions may continue their previous purchase processing until updated.\n\nFor assistance with earlier purchase-related data, email fistulatracker@gmail.com with the subject \"Fistula Tracker data deletion request\". Include an order number and approximate purchase date if available. If you never purchased, state that in your request. Do not include medical records or photographs. The developer will help identify the relevant record where possible and normally handle verified deletion requests within 30 days.\n\nGoogle Play may retain transaction records independently for legal, accounting, security or dispute-resolution purposes. Removing the SDK does not refund or erase a past store transaction. See https://policies.google.com/privacy and https://www.revenuecat.com/privacy-policy for those providers' practices."
  },
  {
    "title": "Data Retention and Deletion",
    "body": "Recovery information remains on your device until you edit or delete it, clear the app's storage or uninstall the app, subject to device backups that you control.\n\nTo delete local information:\n\n1. Open More.\n2. Open Settings & privacy.\n3. Scroll to Data.\n4. Choose Delete recovery history, Delete all photos or Delete all app data.\n\nDeleting recovery history leaves saved schedules, setup, settings, essentials and photos in place. Deleting all photos removes the app's private photo files and timeline records. Deleting all app data removes local records, settings, reminders and private photos and returns the app to its opening setup.\n\nLocal deletion does not erase device backups, feedback emails or records held by the providers used in earlier versions. Contact fistulatracker@gmail.com for requests concerning feedback emails or earlier purchase data."
  },
  {
    "title": "Security",
    "body": "Fistula Tracker relies on the security protections provided by your device and operating system, including app-private storage and optional device authentication. No storage method can be guaranteed to be completely secure. Keep your device updated and protected with a passcode."
  },
  {
    "title": "Children",
    "body": "Fistula Tracker is intended for adults and is not specifically directed to children. The developer does not knowingly collect children's recovery information through a developer-operated service."
  },
  {
    "title": "Medical and Emergency Disclaimer",
    "body": "Fistula Tracker is a personal record and reminder tool, not a medical device or healthcare service. It does not diagnose conditions, detect infection, prescribe care, recommend medication doses or replace a qualified healthcare professional. Do not rely on the app during an emergency; contact local emergency services or an appropriate clinician."
  },
  {
    "title": "Changes to This Policy",
    "body": "This policy may be updated when the app's features or privacy practices change. The updated policy will show a revised \"Last updated\" date. Material changes will be reflected in the app and on the publicly available policy page."
  },
  {
    "title": "Contact",
    "body": "Developer: Siddharth Farkade\nEmail: fistulatracker@gmail.com\n\nFor privacy questions or data-related requests concerning Fistula Tracker, contact the developer at this email address."
  }
] as const;

