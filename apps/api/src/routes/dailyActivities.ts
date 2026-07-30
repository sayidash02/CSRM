import { Router } from 'express';
import { createDailyActivity, getDailyActivities, deleteDailyActivity, updateDailyActivity } from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/', createDailyActivity);
router.get('/', getDailyActivities);
router.delete('/:id', deleteDailyActivity);
router.put('/:id', updateDailyActivity);

export default router;
