const TEST_DATABASE_NAME_PATTERN = /^crms_(test|ci)_[a-z0-9_]+$/i;
const DISPOSABLE_DATABASE_NAME_PATTERN = /^crms_(clone|restore)_[a-z0-9_]+$/i;
const NON_TEST_MARKER_PATTERN = /(^|_)(dev|development|prod|production|live|staging)(_|$)/i;

function stripWrappingQuotes(value: string): string {
  return value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

export function databaseNameFromUrl(rawUrl: string | undefined): string {
  if (!rawUrl) throw new Error('DATABASE_URL is required');

  let parsed: URL;
  try {
    parsed = new URL(stripWrappingQuotes(rawUrl));
  } catch {
    throw new Error('DATABASE_URL must be a valid URL');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error('DATABASE_URL must include a safe database name');
  }
  return databaseName;
}

export function assertIsolatedTestDatabaseUrl(rawUrl: string | undefined): string {
  const databaseName = databaseNameFromUrl(rawUrl);
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName) || NON_TEST_MARKER_PATTERN.test(databaseName)) {
    throw new Error(
      `Refusing database operation: ${databaseName} is not an isolated test database. ` +
        'Use a database name matching crms_test_* or crms_ci_*.'
    );
  }
  return databaseName;
}

export function assertDisposableDatabaseName(rawName: string | undefined): string {
  const databaseName = rawName?.trim();
  if (!databaseName || !DISPOSABLE_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      'Disposable database name must match crms_clone_* or crms_restore_*.'
    );
  }
  return databaseName;
}

export function databaseUrlForName(rawUrl: string, databaseName: string): string {
  const parsed = new URL(stripWrappingQuotes(rawUrl));
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

export function quoteDatabaseIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe database identifier: ${value}`);
  }
  return `\`${value}\``;
}
