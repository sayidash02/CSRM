import { Router } from 'express';
import {
  createStakeholder,
  getStakeholders,
  updateStakeholder,
  deleteStakeholder,
  restoreStakeholder
} from '../controllers/StakeholdersController';

const router = Router();

router.post('/', createStakeholder);
router.get('/', getStakeholders);
router.put('/:id', updateStakeholder);
router.delete('/:id', deleteStakeholder);
router.patch('/:id/restore', restoreStakeholder);

export default router;
