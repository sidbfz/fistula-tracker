import * as SQLite from 'expo-sqlite';

import { DATABASE_VERSION, pendingMigrationVersions } from '@/src/lib/migrations';

import type {
  DailyLog,
  DailyLogInput,
  EssentialItem,
  JournalEntry,
  MedicationEvent,
  MedicationStatus,
  MedicationTime,
  MedicationWithTimes,
  RecoveryItem,
  RecoveryProfile,
  Reminder,
  RoutineEvent,
  RoutineTask,
  WoundPhoto,
} from '@/src/types';

let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

export function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('recovery.db');
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;
  const pendingMigrations = pendingMigrationVersions(currentVersion);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recovery_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      had_surgery INTEGER NOT NULL DEFAULT 0,
      surgery_date TEXT,
      procedure_type TEXT,
      recovery_stage TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT NOT NULL UNIQUE,
      pain INTEGER NOT NULL CHECK (pain BETWEEN 0 AND 10),
      bleeding INTEGER NOT NULL CHECK (bleeding BETWEEN 0 AND 3),
      drainage INTEGER NOT NULL CHECK (drainage BETWEEN 0 AND 3),
      bowel_movement INTEGER NOT NULL DEFAULT 0,
      sitz_bath INTEGER NOT NULL DEFAULT 0,
      dressing_changed INTEGER NOT NULL DEFAULT 0,
      medication_taken INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wound_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_date TEXT NOT NULL,
      file_uri TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL UNIQUE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recovery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      time TEXT NOT NULL,
      notification_id TEXT
    );
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL CHECK (kind IN ('scheduled', 'as_needed')),
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS medication_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      time TEXT NOT NULL,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      notification_id TEXT,
      UNIQUE(medication_id, time)
    );
    CREATE TABLE IF NOT EXISTS medication_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER REFERENCES medications(id) ON DELETE SET NULL,
      medication_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'postponed')),
      occurred_at TEXT NOT NULL,
      scheduled_for TEXT,
      postponed_until TEXT,
      notification_id TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS medication_events_occurred_at ON medication_events(occurred_at DESC);
    CREATE TABLE IF NOT EXISTS routine_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('sitz_bath', 'dressing_change', 'wound_photo', 'water_fibre', 'custom')),
      title TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      time TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      notification_id TEXT,
      active INTEGER NOT NULL DEFAULT 0,
      default_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS routine_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES routine_tasks(id) ON DELETE SET NULL,
      task_title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('done', 'skipped', 'postponed')),
      occurred_at TEXT NOT NULL,
      scheduled_for TEXT,
      postponed_until TEXT,
      notification_id TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS routine_events_occurred_at ON routine_events(occurred_at DESC);
    CREATE TABLE IF NOT EXISTS essential_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      patient_shared INTEGER NOT NULL DEFAULT 0,
      default_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('biometric_enabled', 'false');
    INSERT OR IGNORE INTO reminders (kind, time) VALUES ('check_in', '20:00');
    INSERT OR IGNORE INTO reminders (kind, time) VALUES ('medication', '09:00');
    INSERT OR IGNORE INTO reminders (kind, time) VALUES ('sitz_bath', '19:00');
    INSERT OR IGNORE INTO reminders (kind, time) VALUES ('dressing_change', '08:00');
  `);

  if (pendingMigrations.includes(2)) {
    await db.execAsync(`
      INSERT OR IGNORE INTO routine_tasks (kind, title, instructions, time, reminder_enabled, notification_id, active, default_key)
        SELECT 'sitz_bath', 'Sitz bath', '', time, enabled, notification_id, enabled, 'sitz_bath' FROM reminders WHERE kind = 'sitz_bath';
      INSERT OR IGNORE INTO routine_tasks (kind, title, instructions, time, reminder_enabled, notification_id, active, default_key)
        SELECT 'dressing_change', 'Dressing change', '', time, enabled, notification_id, enabled, 'dressing_change' FROM reminders WHERE kind = 'dressing_change';
      INSERT OR IGNORE INTO routine_tasks (kind, title, instructions, active, default_key) VALUES ('wound_photo', 'Private wound photo', 'Only when you choose to record one', 0, 'wound_photo');
      INSERT OR IGNORE INTO routine_tasks (kind, title, instructions, active, default_key) VALUES ('water_fibre', 'Water or fibre goal', 'Use the target you chose or were given', 0, 'water_fibre');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Portable bidet', 1, 'portable_bidet');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Toilet-rim sitz bath', 1, 'toilet_sitz_bath');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Gauze or dressings', 1, 'gauze_dressings');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Loose clothing', 1, 'loose_clothing');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Cushion, if personally comfortable', 1, 'cushion');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Medication organizer', 1, 'medication_organizer');
      INSERT OR IGNORE INTO essential_items (title, patient_shared, default_key) VALUES ('Supplies for returning to university or work', 1, 'return_supplies');
    `);
  }

  if (pendingMigrations.includes(3)) {
    await db.execAsync(`
      UPDATE routine_tasks
      SET active = 0, instructions = '', updated_at = CURRENT_TIMESTAMP
      WHERE default_key IN ('sitz_bath', 'dressing_change')
        AND reminder_enabled = 0
        AND notification_id IS NULL
        AND instructions = 'Your own care instruction';
    `);
  }

  if (pendingMigrations.includes(4)) {
    await db.execAsync(`
      ALTER TABLE medications ADD COLUMN weekdays TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7';
    `);
  }

  if (pendingMigrations.includes(5)) {
    await db.execAsync(`
      INSERT INTO journal_entries (entry_date, body)
      SELECT log_date, notes FROM daily_logs
      WHERE TRIM(notes) != ''
        AND NOT EXISTS (SELECT 1 FROM journal_entries WHERE entry_date = daily_logs.log_date);
    `);
  }

  if (pendingMigrations.includes(6)) {
    await db.execAsync(`
      UPDATE journal_entries AS keeper
      SET body = (
        SELECT GROUP_CONCAT(part.body, CHAR(10) || CHAR(10))
        FROM (
          SELECT TRIM(duplicate.body) AS body
          FROM journal_entries AS duplicate
          WHERE duplicate.entry_date = keeper.entry_date
            AND TRIM(duplicate.body) != ''
          ORDER BY duplicate.created_at, duplicate.id
        ) AS part
      ), updated_at = CURRENT_TIMESTAMP
      WHERE keeper.id = (
        SELECT MAX(candidate.id)
        FROM journal_entries AS candidate
        WHERE candidate.entry_date = keeper.entry_date
      )
        AND (
          SELECT COUNT(*)
          FROM journal_entries AS duplicate
          WHERE duplicate.entry_date = keeper.entry_date
        ) > 1;
      DELETE FROM journal_entries
      WHERE id NOT IN (
        SELECT MAX(id) FROM journal_entries GROUP BY entry_date
      );
      CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_entry_date_unique
        ON journal_entries(entry_date);
      UPDATE daily_logs
      SET notes = COALESCE(
        (SELECT body FROM journal_entries WHERE entry_date = daily_logs.log_date),
        notes
      ), updated_at = CURRENT_TIMESTAMP
      WHERE EXISTS (
        SELECT 1 FROM journal_entries WHERE entry_date = daily_logs.log_date
      );
    `);
  }

  if (pendingMigrations.length) await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}

export async function getSetting(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getProfile() {
  const db = await getDatabase();
  return db.getFirstAsync<RecoveryProfile>('SELECT * FROM recovery_profile WHERE id = 1');
}

export async function saveProfile(input: Omit<RecoveryProfile, 'id'>) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO recovery_profile (id, had_surgery, surgery_date, procedure_type, recovery_stage)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET had_surgery = excluded.had_surgery,
       surgery_date = excluded.surgery_date, procedure_type = excluded.procedure_type,
       recovery_stage = excluded.recovery_stage`,
    input.had_surgery,
    input.surgery_date,
    input.procedure_type,
    input.recovery_stage,
  );
}

export async function listDailyLogs() {
  const db = await getDatabase();
  return db.getAllAsync<DailyLog>('SELECT * FROM daily_logs ORDER BY log_date DESC');
}

export async function getDailyLog(date: string) {
  const db = await getDatabase();
  return db.getFirstAsync<DailyLog>('SELECT * FROM daily_logs WHERE log_date = ?', date);
}

export async function saveDailyLog(input: DailyLogInput) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_logs
      (log_date, pain, bleeding, drainage, bowel_movement, sitz_bath, dressing_changed, medication_taken, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(log_date) DO UPDATE SET pain = excluded.pain, bleeding = excluded.bleeding,
       drainage = excluded.drainage, bowel_movement = excluded.bowel_movement,
       sitz_bath = excluded.sitz_bath, dressing_changed = excluded.dressing_changed,
       medication_taken = excluded.medication_taken, notes = excluded.notes,
       updated_at = CURRENT_TIMESTAMP`,
    input.log_date,
    input.pain,
    input.bleeding,
    input.drainage,
    input.bowel_movement,
    input.sitz_bath,
    input.dressing_changed,
    input.medication_taken,
    input.notes.trim(),
  );
}

export async function deleteDailyLog(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM daily_logs WHERE id = ?', id);
}

export async function addPhoto(photoDate: string, fileUri: string) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO wound_photos (photo_date, file_uri) VALUES (?, ?)', photoDate, fileUri);
}

export async function listPhotos() {
  const db = await getDatabase();
  return db.getAllAsync<WoundPhoto>('SELECT * FROM wound_photos ORDER BY photo_date ASC, created_at ASC');
}

export async function deletePhotoRecord(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wound_photos WHERE id = ?', id);
}

export async function deleteAllPhotoRecords() {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wound_photos');
}

export async function listJournalEntries() {
  const db = await getDatabase();
  return db.getAllAsync<JournalEntry>('SELECT * FROM journal_entries ORDER BY entry_date DESC, created_at DESC');
}

export async function saveJournalEntry(entryDate: string, body: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO journal_entries (entry_date, body) VALUES (?, ?)
       ON CONFLICT(entry_date) DO UPDATE SET
         body = excluded.body,
         updated_at = CURRENT_TIMESTAMP`,
      entryDate,
      body.trim(),
    );
    await db.runAsync('UPDATE daily_logs SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE log_date = ?', body.trim(), entryDate);
  });
}

export async function saveJournalForDate(entryDate: string, body: string) {
  const db = await getDatabase();
  const cleanBody = body.trim();
  if (cleanBody) {
    await saveJournalEntry(entryDate, cleanBody);
    return;
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM journal_entries WHERE entry_date = ?', entryDate);
    await db.runAsync("UPDATE daily_logs SET notes = '', updated_at = CURRENT_TIMESTAMP WHERE log_date = ?", entryDate);
  });
}

export async function deleteJournalEntry(id: number) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const entry = await db.getFirstAsync<{ entry_date: string }>('SELECT entry_date FROM journal_entries WHERE id = ?', id);
    await db.runAsync('DELETE FROM journal_entries WHERE id = ?', id);
    if (entry) await db.runAsync("UPDATE daily_logs SET notes = '', updated_at = CURRENT_TIMESTAMP WHERE log_date = ?", entry.entry_date);
  });
}

export async function listRecoveryItems() {
  const db = await getDatabase();
  return db.getAllAsync<RecoveryItem>('SELECT * FROM recovery_items ORDER BY completed ASC, created_at DESC');
}

export async function saveRecoveryItem(title: string, id?: number) {
  const db = await getDatabase();
  if (id) {
    await db.runAsync('UPDATE recovery_items SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', title.trim(), id);
  } else {
    await db.runAsync('INSERT INTO recovery_items (title) VALUES (?)', title.trim());
  }
}

export async function saveRecoveryItemIfMissing(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM recovery_items WHERE title = ? COLLATE NOCASE LIMIT 1',
    cleanTitle,
  );
  if (!existing) await db.runAsync('INSERT INTO recovery_items (title) VALUES (?)', cleanTitle);
}

export async function toggleRecoveryItem(id: number, completed: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE recovery_items SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    completed ? 1 : 0,
    id,
  );
}

export async function deleteRecoveryItem(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recovery_items WHERE id = ?', id);
}

export async function listReminders() {
  const db = await getDatabase();
  return db.getAllAsync<Reminder>('SELECT * FROM reminders ORDER BY id');
}

export async function updateReminder(kind: Reminder['kind'], enabled: boolean, time: string, notificationId: string | null) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE reminders SET enabled = ?, time = ?, notification_id = ? WHERE kind = ?',
    enabled ? 1 : 0,
    time,
    notificationId,
    kind,
  );
}

export async function listMedications(includeArchived = false) {
  const db = await getDatabase();
  const medications = await db.getAllAsync<Omit<MedicationWithTimes, 'times'>>(
    `SELECT * FROM medications ${includeArchived ? '' : "WHERE status != 'archived'"} ORDER BY status = 'active' DESC, name COLLATE NOCASE`,
  );
  const times = await db.getAllAsync<MedicationTime>('SELECT * FROM medication_times ORDER BY time');
  return medications.map((medication) => ({ ...medication, times: times.filter((time) => time.medication_id === medication.id) }));
}

export async function getMedication(id: number) {
  const db = await getDatabase();
  const medication = await db.getFirstAsync<Omit<MedicationWithTimes, 'times'>>('SELECT * FROM medications WHERE id = ?', id);
  if (!medication) return null;
  const times = await db.getAllAsync<MedicationTime>('SELECT * FROM medication_times WHERE medication_id = ? ORDER BY time', id);
  return { ...medication, times };
}

export async function saveMedication(
  input: { name: string; instructions: string; kind: 'scheduled' | 'as_needed'; notes: string; weekdays: string; status?: MedicationStatus },
  times: { time: string; reminder_enabled: boolean; notification_id?: string | null }[],
  id?: number,
) {
  const db = await getDatabase();
  let medicationId = id;
  await db.withTransactionAsync(async () => {
    if (medicationId) {
      await db.runAsync(
        `UPDATE medications SET name = ?, instructions = ?, kind = ?, notes = ?, weekdays = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        input.name.trim(), input.instructions.trim(), input.kind, input.notes.trim(), input.weekdays, input.status ?? 'active', medicationId,
      );
      await db.runAsync('DELETE FROM medication_times WHERE medication_id = ?', medicationId);
    } else {
      const result = await db.runAsync(
        'INSERT INTO medications (name, instructions, kind, notes, weekdays, status) VALUES (?, ?, ?, ?, ?, ?)',
        input.name.trim(), input.instructions.trim(), input.kind, input.notes.trim(), input.weekdays, input.status ?? 'active',
      );
      medicationId = Number(result.lastInsertRowId);
    }
    if (input.kind === 'scheduled') {
      for (const row of times) {
        await db.runAsync(
          'INSERT INTO medication_times (medication_id, time, reminder_enabled, notification_id) VALUES (?, ?, ?, ?)',
          medicationId!, row.time, row.reminder_enabled ? 1 : 0, row.notification_id ?? null,
        );
      }
    }
  });
  return medicationId!;
}

export async function updateMedicationStatus(id: number, status: MedicationStatus) {
  const db = await getDatabase();
  await db.runAsync('UPDATE medications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, id);
}

export async function updateMedicationTimeNotification(id: number, enabled: boolean, notificationId: string | null) {
  const db = await getDatabase();
  await db.runAsync('UPDATE medication_times SET reminder_enabled = ?, notification_id = ? WHERE id = ?', enabled ? 1 : 0, notificationId, id);
}

export async function deleteMedication(id: number, deleteHistory: boolean) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    if (deleteHistory) await db.runAsync('DELETE FROM medication_events WHERE medication_id = ?', id);
    await db.runAsync('DELETE FROM medications WHERE id = ?', id);
  });
}

export async function listMedicationEvents(limit?: number) {
  const db = await getDatabase();
  return db.getAllAsync<MedicationEvent>(
    `SELECT * FROM medication_events ORDER BY occurred_at DESC, id DESC${limit ? ' LIMIT ?' : ''}`,
    ...(limit ? [limit] : []),
  );
}

export async function saveMedicationEvent(input: {
  medication_id: number;
  medication_name: string;
  status: MedicationEvent['status'];
  occurred_at: string;
  scheduled_for?: string | null;
  postponed_until?: string | null;
  notification_id?: string | null;
  note?: string;
}) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO medication_events
      (medication_id, medication_name, status, occurred_at, scheduled_for, postponed_until, notification_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.medication_id, input.medication_name, input.status, input.occurred_at, input.scheduled_for ?? null,
    input.postponed_until ?? null, input.notification_id ?? null, input.note?.trim() ?? '',
  );
  return Number(result.lastInsertRowId);
}

export async function deleteMedicationEvent(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM medication_events WHERE id = ?', id);
}

export async function listRoutineTasks(includeInactive = true) {
  const db = await getDatabase();
  return db.getAllAsync<RoutineTask>(`SELECT * FROM routine_tasks ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY default_key IS NULL, id`);
}

export async function setDefaultRoutineSelections(defaultKeys: string[]) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_tasks SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE default_key IS NOT NULL');
    for (const key of defaultKeys) {
      await db.runAsync('UPDATE routine_tasks SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE default_key = ?', key);
    }
  });
}

export async function saveRoutineTask(
  input: Pick<RoutineTask, 'kind' | 'title' | 'instructions' | 'time'> & { reminder_enabled: boolean; active: boolean; notification_id?: string | null; default_key?: string | null },
  id?: number,
) {
  const db = await getDatabase();
  if (id) {
    await db.runAsync(
      `UPDATE routine_tasks SET kind = ?, title = ?, instructions = ?, time = ?, reminder_enabled = ?, notification_id = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      input.kind, input.title.trim(), input.instructions.trim(), input.time, input.reminder_enabled ? 1 : 0,
      input.notification_id ?? null, input.active ? 1 : 0, id,
    );
    return id;
  }
  const result = await db.runAsync(
    `INSERT INTO routine_tasks (kind, title, instructions, time, reminder_enabled, notification_id, active, default_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.kind, input.title.trim(), input.instructions.trim(), input.time, input.reminder_enabled ? 1 : 0,
    input.notification_id ?? null, input.active ? 1 : 0, input.default_key ?? null,
  );
  return Number(result.lastInsertRowId);
}

export async function deleteRoutineTask(id: number, deleteHistory: boolean) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    if (deleteHistory) await db.runAsync('DELETE FROM routine_events WHERE task_id = ?', id);
    await db.runAsync('DELETE FROM routine_tasks WHERE id = ?', id);
  });
}

export async function listRoutineEvents(limit?: number) {
  const db = await getDatabase();
  return db.getAllAsync<RoutineEvent>(
    `SELECT * FROM routine_events ORDER BY occurred_at DESC, id DESC${limit ? ' LIMIT ?' : ''}`,
    ...(limit ? [limit] : []),
  );
}

export async function saveRoutineEvent(input: {
  task_id: number;
  task_title: string;
  status: RoutineEvent['status'];
  occurred_at: string;
  scheduled_for?: string | null;
  postponed_until?: string | null;
  notification_id?: string | null;
  note?: string;
}) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO routine_events (task_id, task_title, status, occurred_at, scheduled_for, postponed_until, notification_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.task_id, input.task_title, input.status, input.occurred_at, input.scheduled_for ?? null,
    input.postponed_until ?? null, input.notification_id ?? null, input.note?.trim() ?? '',
  );
  return Number(result.lastInsertRowId);
}

export async function deleteRoutineEvent(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM routine_events WHERE id = ?', id);
}

export async function listEssentialItems() {
  const db = await getDatabase();
  return db.getAllAsync<EssentialItem>('SELECT * FROM essential_items ORDER BY patient_shared DESC, id');
}

export async function saveEssentialItem(title: string, id?: number) {
  const db = await getDatabase();
  if (id) {
    await db.runAsync('UPDATE essential_items SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', title.trim(), id);
    return id;
  }
  const result = await db.runAsync('INSERT INTO essential_items (title, patient_shared) VALUES (?, 0)', title.trim());
  return Number(result.lastInsertRowId);
}

export async function toggleEssentialItem(id: number, completed: boolean) {
  const db = await getDatabase();
  await db.runAsync('UPDATE essential_items SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', completed ? 1 : 0, id);
}

export async function deleteEssentialItem(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM essential_items WHERE id = ?', id);
}

export async function restoreEssentialDefaults() {
  const db = await getDatabase();
  const defaults = [
    ['portable_bidet', 'Portable bidet'],
    ['toilet_sitz_bath', 'Toilet-rim sitz bath'],
    ['gauze_dressings', 'Gauze or dressings'],
    ['loose_clothing', 'Loose clothing'],
    ['cushion', 'Cushion, if personally comfortable'],
    ['medication_organizer', 'Medication organizer'],
    ['return_supplies', 'Supplies for returning to university or work'],
  ];
  for (const [key, title] of defaults) {
    await db.runAsync(
      `INSERT INTO essential_items (title, patient_shared, default_key) VALUES (?, 1, ?)
       ON CONFLICT(default_key) DO UPDATE SET title = excluded.title, patient_shared = 1, updated_at = CURRENT_TIMESTAMP`,
      title,
      key,
    );
  }
}

export async function clearStructuredData() {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM daily_logs;
      DELETE FROM wound_photos;
      DELETE FROM journal_entries;
      DELETE FROM recovery_items;
      DELETE FROM medication_events;
      DELETE FROM medication_times;
      DELETE FROM medications;
      DELETE FROM routine_events;
      DELETE FROM routine_tasks;
      DELETE FROM essential_items;
      DELETE FROM recovery_profile;
      DELETE FROM settings WHERE key IN (
        'display_name',
        'onboarding_recurrence',
        'onboarding_procedure_count',
        'onboarding_impacts',
        'notification_wording',
        'app_color_scheme'
      );
      UPDATE reminders SET enabled = 0, notification_id = NULL;
      UPDATE settings SET value = 'false' WHERE key IN ('onboarding_complete', 'biometric_enabled');
      PRAGMA user_version = 0;
    `);
  });
}

export async function clearRecoveryHistory() {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM daily_logs;
      DELETE FROM journal_entries;
      DELETE FROM recovery_items;
      DELETE FROM medication_events;
      DELETE FROM routine_events;
    `);
  });
}
