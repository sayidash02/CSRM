import { Router } from 'express';
import {
  createProposal,
  getProposals,
  updateProposal,
  deleteProposal
} from '../controllers/ProposalsController';

const router = Router();

router.post('/', createProposal);
router.get('/', getProposals);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

export default router;
