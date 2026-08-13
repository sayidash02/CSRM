import { Router } from 'express';
import { getAuditLogs } from '../controllers/AuditLogController';

const router = Router();
router.get('/:entityType/:entityId', getAuditLogs);
export default router;
