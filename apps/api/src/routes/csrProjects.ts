import { Router } from 'express';
import {
  createCsrProject,
  getCsrProjects,
  updateCsrProject,
  deleteCsrProject,
  restoreCsrProject
} from '../controllers/CsrProjectsController';

const router = Router();

router.post('/', createCsrProject);
router.get('/', getCsrProjects);
router.put('/:id', updateCsrProject);
router.delete('/:id', deleteCsrProject);
router.patch('/:id/restore', restoreCsrProject);

export default router;
