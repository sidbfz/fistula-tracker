import assert from 'node:assert/strict';
import test from 'node:test';

import { includesDate, parseWeekdays, serializeWeekdays, weekdaySummary } from './weekdays';

test('serializes selected reminder weekdays without duplicates', () => {
  assert.equal(serializeWeekdays([2, 4, 2, 6]), '2,4,6');
  assert.deepEqual(parseWeekdays('2,4,6'), [2, 4, 6]);
});

test('matches Expo weekday numbering where Sunday is one', () => {
  assert.equal(includesDate([2, 4, 6], new Date(2026, 7, 13)), false);
  assert.equal(includesDate([2, 4, 6], new Date(2026, 7, 14)), true);
});

test('summarizes daily and selected weekday schedules', () => {
  assert.equal(weekdaySummary([1, 2, 3, 4, 5, 6, 7]), 'Every day');
  assert.equal(weekdaySummary([2, 4, 6]), 'Mon, Wed, Fri');
});
