import { Router } from 'express';
import { archiveYear, restoreYear } from '../controllers/ArchiveController';

const router = Router();

router.post('/archive', archiveYear);
router.post('/restore', restoreYear);

export default router;
