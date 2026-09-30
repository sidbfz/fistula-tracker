import assert from 'node:assert/strict';
import test from 'node:test';

import { DATABASE_VERSION, pendingMigrationVersions } from './migrations';

test('new and legacy databases apply every migration in order', () => {
  assert.equal(DATABASE_VERSION, 6);
  assert.deepEqual(pendingMigrationVersions(0), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(pendingMigrationVersions(1), [2, 3, 4, 5, 6]);
  assert.deepEqual(pendingMigrationVersions(2), [3, 4, 5, 6]);
  assert.deepEqual(pendingMigrationVersions(3), [4, 5, 6]);
  assert.deepEqual(pendingMigrationVersions(4), [5, 6]);
  assert.deepEqual(pendingMigrationVersions(5), [6]);
  assert.deepEqual(pendingMigrationVersions(6), []);
});

test('invalid or future schema versions are not silently downgraded', () => {
  assert.deepEqual(pendingMigrationVersions(-1), []);
  assert.deepEqual(pendingMigrationVersions(7), []);
});
