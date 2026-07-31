import { Router } from 'express';
import { createLrp, getLrps, updateLrp, deleteLrp } from '../controllers/LrpController';

const router = Router();

router.post('/', createLrp);
router.get('/', getLrps);
router.put('/:id', updateLrp);
router.delete('/:id', deleteLrp);

export default router;
