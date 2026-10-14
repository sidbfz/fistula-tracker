# Fistula Tracker 1.0.3 closed-test guide

## Release notes for Google Play

```text
<en-US>
Every feature is now free, with no in-app purchases.
Added Send feedback and app version details in Settings.
Improved check-in scrolling for large text and longer medicine lists.
Improved scrolling and keyboard access during setup.
Preserved journal entries and unfinished check-ins when managing medicines.
Fixed the selected photo opening at the wrong position.
Fixed Delete all app data and startup after an earlier failed reset.
Updated privacy information.
</en-US>
```

## Message to testers

Thanks for helping test Fistula Tracker. Please update to version 1.0.3 and keep your existing closed-test opt-in active. Use fictional entries and a harmless sample image; there is no need to share medical details.

Use the app naturally during the test period. When convenient, try the steps below and send feedback using More > Settings & privacy > Send feedback, or through Google Play's private testing feedback. Tell me your app version, phone model if you are comfortable, Android version, what you tried, and anything that worked incorrectly. A short "tested these steps and they worked" report is useful too.

## Checklist

- Update over your existing installation. Check that your previous records, photos, schedules and settings remain. Do not uninstall to update.
- Confirm the supporter purchase option is gone and Settings shows version 1.0.3, build 6.
- Write a fictional journal entry before making today's first check-in. Complete the check-in and confirm the journal entry remains.
- Start a check-in, choose some answers, open Manage medicines, then return. Confirm the unfinished answers remain.
- Complete a check-in with the keyboard open. Scroll to the save action and try Done typing and Android Back.
- Try the check-in at your preferred text size, including larger text, and with several scheduled medicines. Confirm all options and Continue/Save are reachable.
- Check the bottom navigation using your phone's usual gesture or three-button navigation.
- Add a fictional medicine and a reminder using your own chosen time. Confirm it appears and that pause/resume behave as expected. Check the reminder after leaving the app.
- Save two harmless sample photos with different dates. Select the second while hidden, reveal it, and check that the image matches the selected date. Hide it, leave the screen, and return.
- Save a journal entry, close and reopen the app, and confirm it remains.
- Open Send feedback. Inspect and edit the draft before sending. Confirm it contains only app/system versions and your own message, with no automatically attached recovery records or photos.
- Check dark mode and, if you use it, device authentication.
- Only if all your entries are disposable test data, test the deletion controls. Read the confirmation carefully. Real recovery records cannot be recovered after deletion.

## Feedback record

Keep reports locally without medical information. For each one, record:

| Date | Version | Device/Android | Steps tested or problem | Fix/version | Retest outcome |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Do not claim that every tester used every feature or that a fix was retested by a tester without their confirmation. Developer emulator checks and external tester feedback are separate evidence.

## Before applying again

1. Publish the signed AAB to the existing closed track and ask enrolled testers to update.
2. Keep at least 12 testers continuously opted in for the period shown in Play Console. Extra testers provide a buffer.
3. Review private feedback and the pre-launch report. Resolve reproducible issues and ask for retesting.
4. Update the public privacy-policy URL to the 1.0.3 policy, and review store description, purchase disclosures and Data safety for every version still distributed on any track. Older 1.0.2 installations used RevenueCat; their historical records are not automatically deleted.
5. Make the next production-access answers specific to actual usage, fixes and verified outcomes. An enrolled tester is not proof of active usage.

This guide does not establish tester engagement or guarantee production access.
