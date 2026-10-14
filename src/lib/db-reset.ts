// Drop dependent tables before their parents so foreign-key checks stay enabled.
// A full reset removes the schema too: replaying ALTER TABLE migrations against
// existing tables after resetting user_version caused duplicate-column failures.
export const RESET_DATABASE_SQL = `
  DROP TABLE IF EXISTS daily_logs;
  DROP TABLE IF EXISTS wound_photos;
  DROP TABLE IF EXISTS journal_entries;
  DROP TABLE IF EXISTS recovery_items;
  DROP TABLE IF EXISTS medication_events;
  DROP TABLE IF EXISTS medication_times;
  DROP TABLE IF EXISTS medications;
  DROP TABLE IF EXISTS routine_events;
  DROP TABLE IF EXISTS routine_tasks;
  DROP TABLE IF EXISTS essential_items;
  DROP TABLE IF EXISTS recovery_profile;
  DROP TABLE IF EXISTS reminders;
  DROP TABLE IF EXISTS settings;
  PRAGMA user_version = 0;
`;
