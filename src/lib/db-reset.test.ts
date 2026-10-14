import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { RESET_DATABASE_SQL } from './db-reset';

function createFixture(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE medications (id INTEGER PRIMARY KEY);
    CREATE TABLE medication_times (id INTEGER PRIMARY KEY, medication_id INTEGER REFERENCES medications(id));
    CREATE TABLE medication_events (id INTEGER PRIMARY KEY, medication_id INTEGER REFERENCES medications(id));
    CREATE TABLE routine_tasks (id INTEGER PRIMARY KEY);
    CREATE TABLE routine_events (id INTEGER PRIMARY KEY, task_id INTEGER REFERENCES routine_tasks(id));
    CREATE TABLE reminders (id INTEGER PRIMARY KEY, time TEXT);
    CREATE TABLE daily_logs (notes TEXT);
    CREATE TABLE wound_photos (file_uri TEXT);
    CREATE TABLE journal_entries (body TEXT);
    CREATE TABLE recovery_items (title TEXT);
    CREATE TABLE essential_items (title TEXT);
    CREATE TABLE recovery_profile (name TEXT);
    ALTER TABLE medications ADD COLUMN weekdays TEXT;
    INSERT INTO settings VALUES ('future-private-setting', 'sample');
    INSERT INTO medications VALUES (1, '1,2,3');
    INSERT INTO medication_times VALUES (1, 1);
    INSERT INTO medication_events VALUES (1, 1);
    INSERT INTO routine_tasks VALUES (1);
    INSERT INTO routine_events VALUES (1, 1);
    INSERT INTO reminders VALUES (1, '09:00');
    INSERT INTO journal_entries VALUES ('fictional QA entry');
    PRAGMA user_version = 6;
  `);
}

test('full reset removes records, unknown settings and the schema without foreign-key failures', () => {
  const db = new DatabaseSync(':memory:');
  try {
    createFixture(db);
    db.exec(`BEGIN; ${RESET_DATABASE_SQL} COMMIT;`);
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all(), []);
    assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 0);
    assert.equal(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1);
  } finally { db.close(); }
});

test('a reset database can be initialized and migrated again, including a second reset', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      createFixture(db);
      db.exec(RESET_DATABASE_SQL);
      assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 0);
    }
  } finally { db.close(); }
});
