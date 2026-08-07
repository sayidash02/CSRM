import { Router } from 'express';
import { createDailyActivity, getDailyActivities, deleteDailyActivity, restoreDailyActivity, updateDailyActivity, importParseExcel, importCommitExcel } from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/import/parse', importParseExcel);
router.post('/import/commit', importCommitExcel);
router.post('/', createDailyActivity);
router.get('/', getDailyActivities);
router.delete('/:id', deleteDailyActivity);
router.patch('/:id/restore', restoreDailyActivity);
router.put('/:id', updateDailyActivity);

export default router;

