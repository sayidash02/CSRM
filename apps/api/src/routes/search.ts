import { Router } from 'express';
import { searchOmni } from '../controllers/SearchController';

const router = Router();

router.get('/', searchOmni);

export default router;
