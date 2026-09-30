import assert from 'node:assert/strict';
import test from 'node:test';

import { dateAtTime, hasRecordedStatus, localISODate, localISOTimestamp, scheduledTimestamp } from './schedule';

test('builds local timestamps without converting the wall-clock date', () => {
  const date = new Date(2026, 7, 12, 9, 5, 7);
  assert.equal(localISODate(date), '2026-08-12');
  assert.equal(localISOTimestamp(date), '2026-08-12T09:05:07');
  assert.equal(scheduledTimestamp('20:30', date), '2026-08-12T20:30:00');
});

test('postpone time uses today when future and tomorrow when already passed', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0);
  const later = dateAtTime('14:30', now)!;
  const passed = dateAtTime('09:30', now)!;
  assert.equal(later.getDate(), 12);
  assert.equal(passed.getDate(), 13);
  assert.equal(dateAtTime('25:00', now), null);
});

test('a completed or skipped occurrence is recorded without treating postponement as completion', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0);
  const scheduled = '2026-08-12T09:00:00';
  assert.equal(hasRecordedStatus([{ status: 'postponed', occurred_at: '2026-08-12T09:01:00', scheduled_for: scheduled }], scheduled, now), false);
  assert.equal(hasRecordedStatus([{ status: 'taken', occurred_at: '2026-08-12T09:02:00', scheduled_for: scheduled }], scheduled, now), true);
  assert.equal(hasRecordedStatus([{ status: 'skipped', occurred_at: '2026-08-12T09:02:00', scheduled_for: null }], null, now), true);
});
