import { Router } from 'express';
import { createTopIssue, getTopIssues, deleteTopIssue, updateTopIssue, restoreTopIssue } from '../controllers/TopIssuesController';

const router = Router();

router.post('/', createTopIssue);
router.get('/', getTopIssues);
router.put('/:id', updateTopIssue);
router.patch('/:id/restore', restoreTopIssue);
router.delete('/:id', deleteTopIssue);

export default router;
