import { Router } from 'express';
import {
  getAll,
  getById,
  create,
  update,
  deleteStakeholder,
  restore
} from '../controllers/StakeholderController';

const router = Router();

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', deleteStakeholder);
router.patch('/:id/restore', restore);

export default router;
