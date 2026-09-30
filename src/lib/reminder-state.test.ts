import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReminderPlan, notificationIdsForDeletion } from './reminder-state';

test('pause cancels the current reminder while preserving the enabled preference outside the plan', () => {
  assert.deepEqual(buildReminderPlan('old-id', false, true, '09:00'), {
    cancelNotificationId: 'old-id',
    shouldSchedule: false,
  });
});

test('resume and wording changes reschedule only active enabled reminders with a time', () => {
  assert.equal(buildReminderPlan(null, true, true, '09:00').shouldSchedule, true);
  assert.equal(buildReminderPlan('old-id', true, false, '09:00').shouldSchedule, false);
  assert.equal(buildReminderPlan('old-id', true, true, null).shouldSchedule, false);
});

test('record deletion finds every unique postponed notification to cancel', () => {
  assert.deepEqual(notificationIdsForDeletion([
    { notification_id: 'one' },
    { notification_id: null },
    { notification_id: 'two' },
    { notification_id: 'one' },
  ]), ['one', 'two']);
});
