import { Router } from 'express';
import { createGrievance, getGrievances, updateGrievance, deleteGrievance, restoreGrievance } from '../controllers/GrievanceController';

const router = Router();

router.get('/', getGrievances);
router.post('/', createGrievance);
router.put('/:id', updateGrievance);
router.delete('/:id', deleteGrievance);
router.patch('/:id/restore', restoreGrievance);

export default router;
