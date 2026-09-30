export type RecoveryProfile = {
  id: number;
  had_surgery: number;
  surgery_date: string | null;
  procedure_type: string | null;
  recovery_stage: string;
};

export type DailyLog = {
  id: number;
  log_date: string;
  pain: number;
  bleeding: number;
  drainage: number;
  bowel_movement: number;
  sitz_bath: number;
  dressing_changed: number;
  medication_taken: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type WoundPhoto = {
  id: number;
  photo_date: string;
  file_uri: string;
  created_at: string;
};

export type JournalEntry = {
  id: number;
  entry_date: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type RecoveryItem = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: number;
  kind: 'check_in' | 'medication' | 'sitz_bath' | 'dressing_change';
  enabled: number;
  time: string;
  notification_id: string | null;
};

export type DailyLogInput = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>;

export type MedicationKind = 'scheduled' | 'as_needed';
export type MedicationStatus = 'active' | 'paused' | 'archived';
export type EventStatus = 'taken' | 'done' | 'skipped' | 'postponed';

export type Medication = {
  id: number;
  name: string;
  instructions: string;
  kind: MedicationKind;
  notes: string;
  status: MedicationStatus;
  weekdays: string;
  created_at: string;
  updated_at: string;
};

export type MedicationTime = {
  id: number;
  medication_id: number;
  time: string;
  reminder_enabled: number;
  notification_id: string | null;
};

export type MedicationWithTimes = Medication & { times: MedicationTime[] };

export type MedicationEvent = {
  id: number;
  medication_id: number | null;
  medication_name: string;
  status: 'taken' | 'skipped' | 'postponed';
  occurred_at: string;
  scheduled_for: string | null;
  postponed_until: string | null;
  notification_id: string | null;
  note: string;
  created_at: string;
};

export type RoutineKind = 'sitz_bath' | 'dressing_change' | 'wound_photo' | 'water_fibre' | 'custom';

export type RoutineTask = {
  id: number;
  kind: RoutineKind;
  title: string;
  instructions: string;
  time: string | null;
  reminder_enabled: number;
  notification_id: string | null;
  active: number;
  default_key: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineEvent = {
  id: number;
  task_id: number | null;
  task_title: string;
  status: 'done' | 'skipped' | 'postponed';
  occurred_at: string;
  scheduled_for: string | null;
  postponed_until: string | null;
  notification_id: string | null;
  note: string;
  created_at: string;
};

export type EssentialItem = {
  id: number;
  title: string;
  completed: number;
  patient_shared: number;
  default_key: string | null;
  created_at: string;
  updated_at: string;
};

export type TodayRoutineItem = {
  key: string;
  source: 'medication' | 'routine';
  source_id: number;
  title: string;
  subtitle: string;
  time: string | null;
  completed: boolean;
};
