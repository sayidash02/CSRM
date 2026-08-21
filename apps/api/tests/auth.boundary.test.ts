import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import { createSession, hashPassword } from '../src/lib/auth';

describe('authentication boundary', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalBypass = process.env.CRMS_TEST_AUTH_BYPASS;
  const username = `boundary-${Date.now()}`;
  const password = 'boundary-test-password';
  const adminUsername = `boundary-admin-${Date.now()}`;
  const adminPassword = 'boundary-admin-password';

  beforeAll(async () => {
    await prisma.users.createMany({
      data: [
        { username, password_hash: hashPassword(password), role: 'USER' },
        { username: adminUsername, password_hash: hashPassword(adminPassword), role: 'ADMIN' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { username: { in: [username, adminUsername] } } });
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    if (originalBypass === undefined) delete process.env.CRMS_TEST_AUTH_BYPASS;
    else process.env.CRMS_TEST_AUTH_BYPASS = originalBypass;
  });

  const sessionCookie = () => `crms_session=${createSession({ id: 0n, username: 'boundary-test', role: 'USER' })}`;

  it('rejects protected API requests without a session outside test mode', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app).get('/api/daily-activities');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
  });

  it('does not expose a local upload filesystem route', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app).get('/uploads/example.png');
    expect(response.status).toBe(404);
  });

  it('disables local upload and mock storage in production', async () => {
    process.env.NODE_ENV = 'production';
    const upload = await request(app)
      .post('/api/daily-activities/upload-photo')
      .set('Cookie', sessionCookie())
      .attach('file', Buffer.from('not-an-image'), 'proof.png');
    expect(upload.status).toBe(400);
    const localRead = await request(app).get('/uploads/example.png');
    expect(localRead.status).toBe(404);
  });

  it('rejects mutating requests from an unknown browser origin', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.invalid')
      .send({ username, password });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('creates a session through username/password login and allows the protected route', async () => {
    process.env.NODE_ENV = 'staging';
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ username, password });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');
    const response = await agent.get('/api/sync/status');
    expect(response.status).toBe(404);
  });

  it('lets a provisioned ADMIN use the same login boundary and receive ADMIN role', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: adminUsername, password: adminPassword });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toEqual({ username: adminUsername, role: 'ADMIN' });
  });

  it('does not expose public registration for USER or ADMIN accounts', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: `attacker-${Date.now()}`, password: 'attacker-password-123', role: 'ADMIN' });

    expect(response.status).toBe(401);

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .set('Cookie', `crms_session=${createSession({ id: 0n, username: 'boundary-admin', role: 'ADMIN' })}`)
      .send({ username: `attacker-admin-${Date.now()}`, password: 'attacker-password-123', role: 'ADMIN' });
    expect(adminResponse.status).toBe(403);
    expect(adminResponse.body.error.code).toBe('ADMIN_READ_ONLY');

    const anonymousAccountCreate = await request(app)
      .post('/api/admin/users')
      .send({ username: `attacker-user-${Date.now()}`, password: 'attacker-password-123', role: 'USER' });
    expect(anonymousAccountCreate.status).toBe(401);
  });

  it('does not expose the destructive reset route in staging', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app).delete('/api/dev/reset').set('Cookie', sessionCookie());
    expect(response.status).toBe(404);
  });

  it('rejects a raw filesystem path at the import confirmation boundary', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app)
      .post('/api/import/confirm')
      .set('Cookie', sessionCookie())
      .send({ fileId: 'C:\\Users\\Public\\sensitive.xlsx' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid or expired import file token');
  });

  it('rejects file:// attachment links before a write handler runs', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app)
      .post('/api/daily-activities')
      .set('Cookie', sessionCookie())
      .send({ document_link: 'file:///etc/passwd' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });
});
