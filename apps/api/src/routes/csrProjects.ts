import { Router } from 'express';
import {
  createCsrProject,
  getCsrProjects,
  updateCsrProject,
  deleteCsrProject
} from '../controllers/CsrProjectsController';

const router = Router();

router.post('/', createCsrProject);
router.get('/', getCsrProjects);
router.put('/:id', updateCsrProject);
router.delete('/:id', deleteCsrProject);

export default router;
