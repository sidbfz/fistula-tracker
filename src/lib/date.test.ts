import assert from 'node:assert/strict';
import test from 'node:test';

import { displayDateToISO, displayDateToLocalDate, formatDateInput, isISODate, isoToDisplayDate, localDateToDisplayDate } from './date';

test('auto-formats typed and pasted date digits', () => {
  assert.equal(formatDateInput('1'), '1');
  assert.equal(formatDateInput('150'), '15-0');
  assert.equal(formatDateInput('1502'), '15-02');
  assert.equal(formatDateInput('15022025'), '15-02-2025');
  assert.equal(formatDateInput('15/02/2025'), '15-02-2025');
  assert.equal(formatDateInput('2025-02-15'), '15-02-2025');
});

test('supports deletion and partial values without inventing digits', () => {
  assert.equal(formatDateInput('15-02-'), '15-02');
  assert.equal(formatDateInput('15-0'), '15-0');
  assert.equal(formatDateInput('15-'), '15');
  assert.equal(formatDateInput(''), '');
});

test('converts valid display dates to ISO', () => {
  assert.equal(displayDateToISO('15-02-2025'), '2025-02-15');
  assert.equal(displayDateToISO('29-02-2024'), '2024-02-29');
  assert.equal(isoToDisplayDate('2025-02-15'), '15-02-2025');
});

test('rejects invalid calendar dates', () => {
  assert.equal(displayDateToISO('29-02-2025'), null);
  assert.equal(displayDateToISO('31-04-2025'), null);
  assert.equal(displayDateToISO('00-12-2025'), null);
  assert.equal(displayDateToISO('15-13-2025'), null);
  assert.equal(displayDateToISO('1-2-2025'), null);
});

test('validates ISO dates independently of the local timezone', () => {
  assert.equal(isISODate('2025-02-15'), true);
  assert.equal(isISODate('2024-02-29'), true);
  assert.equal(isISODate('2025-02-29'), false);
  assert.equal(isISODate('2025-04-31'), false);
});

test('converts native picker dates without shifting the local calendar day', () => {
  const picked = new Date(2025, 1, 15, 18, 45);
  assert.equal(localDateToDisplayDate(picked), '15-02-2025');
  const restored = displayDateToLocalDate('15-02-2025')!;
  assert.equal(restored.getFullYear(), 2025);
  assert.equal(restored.getMonth(), 1);
  assert.equal(restored.getDate(), 15);
  assert.equal(displayDateToLocalDate('31-02-2025'), null);
});
