import { Router } from 'express';
import { 
  createGrievance, 
  getGrievances, 
  updateGrievance, 
  deleteGrievance, 
  restoreGrievance,
  uploadGrievancePhoto,
  getGrievancePhoto,
  deleteGrievancePhoto,
  reorderGrievancePhotos
} from '../controllers/GrievanceController';

const router = Router();

router.get('/', getGrievances);
router.post('/', createGrievance);
router.put('/:id', updateGrievance);
router.delete('/:id', deleteGrievance);
router.patch('/:id/restore', restoreGrievance);

// Grievance Photo Attachment Routes
router.post('/:id/photos', uploadGrievancePhoto);
router.get('/:id/photos/:photoId', getGrievancePhoto);
router.delete('/:id/photos/:photoId', deleteGrievancePhoto);
router.post('/:id/photos/reorder', reorderGrievancePhotos);

export default router;
