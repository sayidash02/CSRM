import { Router } from 'express';
import { 
  createDailyActivity, 
  getDailyActivities, 
  deleteDailyActivity, 
  restoreDailyActivity, 
  updateDailyActivity, 
  importParseExcel, 
  importCommitExcel,
  exportSingleMom,
  exportMomWorkbook,
  uploadPhoto,
  getPhoto,
  updatePhoto,
  deletePhoto
} from '../controllers/DailyActivitiesController';

const router = Router();
router.post('/upload-photo', uploadPhoto);
router.post('/import/parse', importParseExcel);
router.post('/import/commit', importCommitExcel);
router.get('/export/mom-workbook', exportMomWorkbook);
router.get('/:id/photos/:photoId', getPhoto);
router.put('/:id/photos/:photoId', updatePhoto);
router.delete('/:id/photos/:photoId', deletePhoto);
router.get('/:id/mom', exportSingleMom);
router.post('/', createDailyActivity);
router.get('/', getDailyActivities);
router.delete('/:id', deleteDailyActivity);
router.patch('/:id/restore', restoreDailyActivity);
router.put('/:id', updateDailyActivity);

export default router;
