import { Router } from 'express';
import { getDashboardStats } from '../controllers/DashboardController';

const router = Router();

router.get('/stats', getDashboardStats);

export default router;
