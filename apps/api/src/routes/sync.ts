import { Router } from 'express';
import { triggerSync, getSyncStatus } from '../controllers/SyncController';

const router = Router();

router.post('/', triggerSync);
router.get('/status', getSyncStatus);

export default router;
