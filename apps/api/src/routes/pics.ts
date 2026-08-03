import { Router } from 'express';
import { getPics, createPic, updatePic, deletePic } from '../controllers/PicsController';

const router = Router();
router.get('/', getPics);
router.post('/', createPic);
router.put('/:id', updatePic);
router.delete('/:id', deletePic);

export default router;
