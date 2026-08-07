import { Router } from 'express';
import {
  createProposal,
  getProposals,
  updateProposal,
  deleteProposal,
  restoreProposal
} from '../controllers/ProposalsController';

const router = Router();

router.post('/', createProposal);
router.get('/', getProposals);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);
router.patch('/:id/restore', restoreProposal);

export default router;
