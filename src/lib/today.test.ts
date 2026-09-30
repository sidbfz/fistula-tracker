import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTodayItems } from './today';

import type { MedicationEvent, MedicationWithTimes, RoutineEvent, RoutineTask } from '@/src/types';

const now = new Date(2026, 7, 13, 12, 0, 0);

const medication: MedicationWithTimes = {
  id: 1,
  name: 'Label medicine',
  instructions: 'As written on label',
  kind: 'scheduled',
  notes: '',
  status: 'active',
  weekdays: '1,2,3,4,5,6,7',
  created_at: '',
  updated_at: '',
  times: [{ id: 10, medication_id: 1, time: '09:00', reminder_enabled: 1, notification_id: null }],
};

const routine: RoutineTask = {
  id: 2,
  kind: 'custom',
  title: 'Discharge instruction',
  instructions: '',
  time: null,
  reminder_enabled: 0,
  notification_id: null,
  active: 1,
  default_key: null,
  created_at: '',
  updated_at: '',
};

test('builds active scheduled medicine and routine occurrences without as-needed doses', () => {
  const asNeeded = { ...medication, id: 3, kind: 'as_needed' as const, times: [] };
  const items = buildTodayItems([medication, asNeeded], [routine], [], [], now);
  assert.deepEqual(items.map((item) => item.key), ['medication-1-10', 'routine-2']);
});

test('matches status only to its own medicine or task and moves recorded items last', () => {
  const medicationEvents: MedicationEvent[] = [{
    id: 1, medication_id: 1, medication_name: medication.name, status: 'taken',
    occurred_at: '2026-08-13T09:02:00', scheduled_for: '2026-08-13T09:00:00',
    postponed_until: null, notification_id: null, note: '', created_at: '',
  }];
  const unrelatedRoutineEvents: RoutineEvent[] = [{
    id: 1, task_id: 99, task_title: 'Other', status: 'done', occurred_at: '2026-08-13T10:00:00',
    scheduled_for: null, postponed_until: null, notification_id: null, note: '', created_at: '',
  }];
  const items = buildTodayItems([medication], [routine], medicationEvents, unrelatedRoutineEvents, now);
  assert.equal(items[0].key, 'routine-2');
  assert.equal(items[0].completed, false);
  assert.equal(items[1].completed, true);
});

test('paused and archived medicines are excluded from today', () => {
  const paused = { ...medication, status: 'paused' as const };
  const archived = { ...medication, id: 4, status: 'archived' as const };
  assert.equal(buildTodayItems([paused, archived], [], [], [], now).length, 0);
});

test('scheduled medicines appear only on their selected weekdays', () => {
  const mondayWednesdayFriday = { ...medication, weekdays: '2,4,6' };
  assert.equal(buildTodayItems([mondayWednesdayFriday], [], [], [], new Date(2026, 7, 13)).length, 0);
  assert.equal(buildTodayItems([mondayWednesdayFriday], [], [], [], new Date(2026, 7, 14)).length, 1);
});
