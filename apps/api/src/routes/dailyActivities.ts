import { Router } from 'express';
import { createDailyActivity } from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/', createDailyActivity);

export default router;
