import { hasRecordedStatus, scheduledTimestamp } from './schedule';
import { includesDate, parseWeekdays } from './weekdays';

import type { MedicationEvent, MedicationWithTimes, RoutineEvent, RoutineTask, TodayRoutineItem } from '@/src/types';

export function buildTodayItems(
  medications: MedicationWithTimes[],
  tasks: RoutineTask[],
  medicationEvents: MedicationEvent[],
  routineEvents: RoutineEvent[],
  now = new Date(),
) {
  const items: TodayRoutineItem[] = [];

  for (const medication of medications) {
    if (medication.status !== 'active' || medication.kind !== 'scheduled') continue;
    if (!includesDate(parseWeekdays(medication.weekdays), now)) continue;
    const ownEvents = medicationEvents.filter((event) => event.medication_id === medication.id);
    for (const medicationTime of medication.times) {
      const scheduledFor = scheduledTimestamp(medicationTime.time, now);
      items.push({
        key: `medication-${medication.id}-${medicationTime.id}`,
        source: 'medication',
        source_id: medication.id,
        title: medication.name,
        subtitle: `Medicine · ${medicationTime.time}`,
        time: medicationTime.time,
        completed: hasRecordedStatus(ownEvents, scheduledFor, now),
      });
    }
  }

  for (const task of tasks) {
    if (!task.active) continue;
    const scheduledFor = task.time ? scheduledTimestamp(task.time, now) : null;
    const ownEvents = routineEvents.filter((event) => event.task_id === task.id);
    items.push({
      key: `routine-${task.id}`,
      source: 'routine',
      source_id: task.id,
      title: task.title,
      subtitle: task.time ? `Routine · ${task.time}` : 'Routine · Any time',
      time: task.time,
      completed: hasRecordedStatus(ownEvents, scheduledFor, now),
    });
  }

  return items.sort((left, right) => {
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    return (left.time ?? '99:99').localeCompare(right.time ?? '99:99') || left.title.localeCompare(right.title);
  });
}
