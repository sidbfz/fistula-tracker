# Developer verification: Fistula Tracker 1.0.3

Date: October 14, 2026. Version: 1.0.3. Android version code: 6.

This records developer checks, not external tester engagement or production approval.

## Automated checks

- `npm run verify` passed: 25 tests, TypeScript, lint, Expo dependency alignment and all 18 Expo Doctor checks.
- SQLite regression tests execute full resets with foreign keys enabled, including removing unknown settings and replaying initialization after repeated resets.
- The feedback URI tests verify its recipient, draft content and encoding, including protection against extra mail parameters.
- Existing tests cover local dates, reminders, medication scheduling, weekday selection and migration ordering.
- The public policy document matches the sections displayed in the app.
- RevenueCat is absent from dependencies and native autolinking. The built APK contains no RevenueCat or Play Billing classes and no billing or advertising-ID permission.

## Android build checks

- Local signed APK and AAB builds succeeded for package `tech.sidfz.fistulatracker`.
- APK metadata reports version 1.0.3, code 6 and target API 36.
- APK signature verification passed. Its signing certificate matches the earlier 1.0.2 APK.
- AAB signature verification reported `jar verified`; Android upload certificates are self-signed.

## Emulator checks

Device: Pixel 7 AVD, Android 17. Testing used a separately signed QA package, `tech.sidfz.fistulatracker.qa`, with fictional records. The normal installed app's data was not cleared or edited.

- Completed onboarding and opened Home.
- Saved a fictional journal entry before today's first check-in.
- Updated the QA installation and confirmed the journal entry remained.
- Started a check-in, changed the pain value, opened Manage medicines, returned and confirmed the selected value remained.
- Confirmed today's existing journal text was loaded into the first check-in.
- Opened the keyboard and verified the shared Done typing control remained visible above it. Used the control, saved the check-in and verified the journal text was unchanged.
- Restarted the QA app and confirmed the saved check-in and journal persisted.
- Reached all six check-in stages at Android font scale 1.4 with the update action reachable. Restored the emulator's original font scale of 1.0 afterward.
- Opened Send feedback and verified version 1.0.3/build 6 and the operating-system version. No email was sent.
- Observed the existing bottom navigation above the gesture-navigation area with the keyboard dismissed.
- Reproduced the earlier full-reset duplicate-column failure. Installed the corrected build over that failed-reset state and verified startup returned to onboarding without a database error.
- Executed Delete all app data again in the QA package and verified the app returned to onboarding with an empty name field. Only disposable QA records were removed.

## Checks still needed from testers

- Real phones, particularly the originally reported Xiaomi device and three-button navigation.
- Actual notification delivery with device battery restrictions and permission changes.
- Longer medicine lists and different screen sizes.
- Two-photo selection/reveal and camera/library permission flows. The photo-position fix was reviewed in source; this is not a claim of a completed live camera/gallery test.
- App lock with enrolled device authentication.
- Review the Google Play pre-launch report after uploading the new bundle.

Use `closed-testing-1.0.3.md` to request and record these checks. Do not report these pending items as verified in a production-access application.
