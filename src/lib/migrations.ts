export const DATABASE_VERSION = 6;

export function pendingMigrationVersions(currentVersion: number, targetVersion = DATABASE_VERSION) {
  if (!Number.isInteger(currentVersion) || currentVersion < 0 || currentVersion > targetVersion) return [];
  return Array.from({ length: targetVersion - currentVersion }, (_, index) => currentVersion + index + 1);
}
