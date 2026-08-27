import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import { createSession, hashPassword } from '../src/lib/auth';

describe('role boundary for account administration', () => {
  const originalBypass = process.env.CRMS_TEST_AUTH_BYPASS;
  const originalNodeEnv = process.env.NODE_ENV;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const userName = `role-user-${suffix}`;
  const adminName = `role-admin-${suffix}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CRMS_TEST_AUTH_BYPASS = 'false';
    await prisma.users.createMany({
      data: [
        { username: userName, password_hash: hashPassword('role-boundary-user-password'), role: 'USER' },
        { username: adminName, password_hash: hashPassword('role-boundary-admin-password'), role: 'ADMIN' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { username: { in: [userName, adminName] } } });
    if (originalBypass === undefined) delete process.env.CRMS_TEST_AUTH_BYPASS;
    else process.env.CRMS_TEST_AUTH_BYPASS = originalBypass;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects USER account administration and allows ADMIN account administration', async () => {
    const user = await prisma.users.findUniqueOrThrow({ where: { username: userName } });
    const admin = await prisma.users.findUniqueOrThrow({ where: { username: adminName } });
    const userCookie = `crms_session=${createSession({ id: user.id, username: user.username, role: user.role })}`;
    const adminCookie = `crms_session=${createSession({ id: admin.id, username: admin.username, role: admin.role })}`;

    const userListResponse = await request(app)
      .get('/api/admin/users')
      .set('Cookie', userCookie);
    expect(userListResponse.status).toBe(403);

    const adminListResponse = await request(app)
      .get('/api/admin/users')
      .set('Cookie', adminCookie);
    expect(adminListResponse.status).toBe(200);
    expect(adminListResponse.body.data[0]).not.toHaveProperty('password_hash');

    const userResponse = await request(app)
      .post('/api/admin/users')
      .set('Cookie', userCookie)
      .send({ username: `blocked-${suffix}`, password: 'blocked-password-123', role: 'USER' });
    expect(userResponse.status).toBe(403);

    const adminResponse = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({ username: `managed-${suffix}`, password: 'managed-password-123', role: 'USER' });
    expect(adminResponse.status).toBe(201);
    expect(adminResponse.body.data).not.toHaveProperty('password_hash');

    const invalidRoleResponse = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({ username: `invalid-role-${suffix}`, password: 'invalid-role-password-123', role: 'SUPERADMIN' });
    expect(invalidRoleResponse.status).toBe(400);
    expect(invalidRoleResponse.body.error.code).toBe('INVALID_ROLE');

    await prisma.users.deleteMany({ where: { username: { in: [`managed-${suffix}`, `invalid-role-${suffix}`] } } });
  });

  it('prevents ADMIN from mutating operational data', async () => {
    const admin = await prisma.users.findUniqueOrThrow({ where: { username: adminName } });
    const adminCookie = `crms_session=${createSession({ id: admin.id, username: admin.username, role: admin.role })}`;
    const response = await request(app)
      .post('/api/stakeholders')
      .set('Cookie', adminCookie)
      .send({ stakeholder: 'Should not be created' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ADMIN_READ_ONLY');
  });

  it('prevents an ADMIN from disabling or demoting the current account', async () => {
    const admin = await prisma.users.findUniqueOrThrow({ where: { username: adminName } });
    const adminCookie = `crms_session=${createSession({ id: admin.id, username: admin.username, role: admin.role })}`;

    const disabled = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set('Cookie', adminCookie)
      .send({ is_active: false });
    expect(disabled.status).toBe(409);
    expect(disabled.body.code).toBe('SELF_ACCOUNT_LOCKOUT');

    const demoted = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set('Cookie', adminCookie)
      .send({ role: 'USER' });
    expect(demoted.status).toBe(409);
    expect(demoted.body.code).toBe('SELF_ACCOUNT_LOCKOUT');
  });

  it('allows authenticated users to view profile and change their own password', async () => {
    const user = await prisma.users.findUniqueOrThrow({ where: { username: userName } });
    const userCookie = `crms_session=${createSession({ id: user.id, username: user.username, role: user.role })}`;

    const profileRes = await request(app)
      .get('/api/auth/profile')
      .set('Cookie', userCookie);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.username).toBe(userName);
    expect(profileRes.body.data.role).toBe('USER');
    expect(profileRes.body.data).toHaveProperty('activity_count');

    // Reject wrong current password
    const wrongPassRes = await request(app)
      .put('/api/auth/profile/password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'wrong-password', newPassword: 'new-valid-password-123' });
    expect(wrongPassRes.status).toBe(400);
    expect(wrongPassRes.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    // Success change password
    const changePassRes = await request(app)
      .put('/api/auth/profile/password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'role-boundary-user-password', newPassword: 'new-valid-password-123' });
    expect(changePassRes.status).toBe(200);
    expect(changePassRes.body.data.success).toBe(true);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: userName, password: 'new-valid-password-123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.authenticated).toBe(true);
  });
});
