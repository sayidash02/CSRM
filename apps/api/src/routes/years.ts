import { Router } from 'express';
import { getAvailableYears } from '../controllers/YearsController';

const router = Router();

router.get('/', getAvailableYears);

export default router;
