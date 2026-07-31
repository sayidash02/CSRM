import { Router } from 'express';
import { createTopIssue, getTopIssues, deleteTopIssue, updateTopIssue } from '../controllers/TopIssuesController';

const router = Router();

router.post('/', createTopIssue);
router.get('/', getTopIssues);
router.put('/:id', updateTopIssue);
router.delete('/:id', deleteTopIssue);

export default router;
