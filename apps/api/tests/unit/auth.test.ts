import {
  createSession,
  getSessionFromCookieHeader,
  getSessionCookieOptions,
  isAuthConfigured,
  hashPassword,
  verifyPassword,
} from '../../src/lib/auth';

describe('single-user authentication boundary', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('is not configured when the database URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(isAuthConfigured()).toBe(false);
  });

  it('creates an opaque session that can be read from a cookie header', () => {
    const sessionToken = createSession();
    expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(getSessionFromCookieHeader(`crms_session=${sessionToken}`)).toBe(true);
  });

  it('does not accept an arbitrary or expired session cookie', () => {
    expect(getSessionFromCookieHeader('crms_session=not-a-session')).toBe(false);
    expect(getSessionFromCookieHeader(undefined)).toBe(false);
  });

  it('uses an httpOnly, same-site cookie and secure cookies in production', () => {
    expect(getSessionCookieOptions('production')).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      }),
    );
  });

  it('hashes passwords with a salted verifier and rejects wrong passwords', () => {
    const encoded = hashPassword('correct horse battery staple');
    expect(encoded.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('correct horse battery staple', encoded)).toBe(true);
    expect(verifyPassword('wrong password', encoded)).toBe(false);
  });

});
