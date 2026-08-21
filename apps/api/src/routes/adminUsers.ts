import { Router } from 'express';
import { requireRole } from '../lib/auth';
import { createUser, listUsers, updateUser } from '../controllers/UserAdminController';

const router = Router();
router.use(requireRole('ADMIN'));
router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);

export default router;
