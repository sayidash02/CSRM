import {
  assertDisposableDatabaseName,
  assertIsolatedTestDatabaseUrl,
  databaseNameFromUrl,
  databaseUrlForName,
} from '../../../../scripts/db/database-safety';

describe('database test safety guards', () => {
  it('accepts only isolated test database names', () => {
    expect(assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms_test_isolated')).toBe('crms_test_isolated');
    expect(assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms_ci_build_123')).toBe('crms_ci_build_123');
  });

  it('rejects development and production-looking database names', () => {
    expect(() => assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms')).toThrow(/isolated test database/);
    expect(() => assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms_production')).toThrow(/isolated test database/);
    expect(() => assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms_dev')).toThrow(/isolated test database/);
    expect(() => assertIsolatedTestDatabaseUrl('mysql://root:@127.0.0.1:3306/crms_test_production')).toThrow(/isolated test database/);
  });

  it('allows only disposable clone/restore names', () => {
    expect(assertDisposableDatabaseName('crms_clone_migration_123')).toBe('crms_clone_migration_123');
    expect(assertDisposableDatabaseName('crms_restore_smoke_123')).toBe('crms_restore_smoke_123');
    expect(() => assertDisposableDatabaseName('crms_test_isolated')).toThrow(/Disposable database name/);
  });

  it('rewrites only the database component of a URL', () => {
    const source = 'mysql://root:test@127.0.0.1:3306/crms_test_isolated?connection_limit=3';
    expect(databaseNameFromUrl(source)).toBe('crms_test_isolated');
    expect(databaseUrlForName(source, 'crms_restore_smoke_123')).toBe(
      'mysql://root:test@127.0.0.1:3306/crms_restore_smoke_123?connection_limit=3',
    );
  });
});
