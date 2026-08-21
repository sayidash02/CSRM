import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { catchAsync } from '../lib/catchAsync';

const normalizeUsername = (value: unknown): string => String(value ?? '').trim().toLowerCase();
const requirePassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 12 || value.length > 200) {
    const error: any = new Error('Password harus berisi 12-200 karakter');
    error.status = 400;
    throw error;
  }
  return value;
};

export const listUsers = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.users.findMany({
    orderBy: { username: 'asc' },
    select: { id: true, username: true, role: true, is_active: true, last_login_at: true, created_at: true, updated_at: true }
  });
  res.json({ data: users });
});

export const createUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const username = normalizeUsername(req.body?.username);
  const password = requirePassword(req.body?.password);
  if (req.body?.role !== 'ADMIN' && req.body?.role !== 'USER') {
    res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'Role akun harus USER atau ADMIN' } });
    return;
  }
  const role = req.body.role;
  if (!/^[a-z0-9._-]{3,100}$/.test(username)) { res.status(400).json({ error: 'Username tidak valid' }); return; }
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.users.create({ data: { username, password_hash: hashPassword(password), role }, select: { id: true, username: true, role: true, is_active: true } });
      await tx.audit_logs.create({ data: { entity_type: 'users', entity_id: created.id, action: 'CREATE', actor_user_id: req.crmsUser?.id || null, changes: { username, role } } });
      return created;
    });
    res.status(201).json({ data: user });
  } catch (error: any) {
    if (error?.code === 'P2002') { res.status(409).json({ error: 'Username sudah digunakan' }); return; }
    throw error;
  }
});

export const updateUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const rawId = String(req.params.id ?? '');
  if (!/^\d+$/.test(rawId)) { res.status(400).json({ error: 'ID akun tidak valid' }); return; }
  const id = BigInt(rawId);
  const data: { password_hash?: string; is_active?: boolean; role?: string } = {};
  if (req.body?.password !== undefined) data.password_hash = hashPassword(requirePassword(req.body.password));
  if (req.body?.is_active !== undefined) {
    if (typeof req.body.is_active !== 'boolean') { res.status(400).json({ error: 'is_active harus boolean' }); return; }
    data.is_active = req.body.is_active;
  }
  if (req.body?.role === 'ADMIN' || req.body?.role === 'USER') data.role = req.body.role;
  if (Object.keys(data).length === 0) { res.status(400).json({ error: 'Tidak ada perubahan akun' }); return; }
  if (
    req.crmsUser?.id === id
    && (data.is_active === false || data.role === 'USER')
  ) {
    res.status(409).json({
      error: 'Akun admin aktif tidak boleh menonaktifkan atau menurunkan role sendiri',
      code: 'SELF_ACCOUNT_LOCKOUT',
    });
    return;
  }
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.users.update({ where: { id }, data, select: { id: true, username: true, role: true, is_active: true } });
    await tx.audit_logs.create({ data: { entity_type: 'users', entity_id: id, action: 'UPDATE', actor_user_id: req.crmsUser?.id || null, changes: { fields: Object.keys(data) } } });
    return updated;
  });
  res.json({ data: user });
});
