import { Router } from 'express';
import { createDailyActivity, getDailyActivities, deleteDailyActivity } from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/', createDailyActivity);
router.get('/', getDailyActivities);
router.delete('/:id', deleteDailyActivity);

export default router;
