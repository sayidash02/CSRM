import { Router } from 'express';
import { createDailyActivity, getDailyActivities, deleteDailyActivity, updateDailyActivity, importParseExcel, importCommitExcel } from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/import/parse', importParseExcel);
router.post('/import/commit', importCommitExcel);
router.post('/', createDailyActivity);
router.get('/', getDailyActivities);
router.delete('/:id', deleteDailyActivity);
router.put('/:id', updateDailyActivity);

export default router;

