import { Router } from 'express';
import { getReferences } from '../controllers/ReferencesController';

const router = Router();
router.get('/', getReferences);

export default router;
