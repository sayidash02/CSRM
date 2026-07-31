import { Router } from 'express';
import { createGrievance, getGrievances, updateGrievance, deleteGrievance } from '../controllers/GrievanceController';

const router = Router();

router.get('/', getGrievances);
router.post('/', createGrievance);
router.put('/:id', updateGrievance);
router.delete('/:id', deleteGrievance);

export default router;
