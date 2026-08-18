import { Router, Request, Response } from 'express';

const router = Router();

const legacySyncDisabled = (_req: Request, res: Response): void => {
  res.status(410).json({
    error: 'Sync otomatis ke SharePoint dinonaktifkan. Download workbook lalu upload manual ke SharePoint.',
  });
};

router.post('/', legacySyncDisabled);
router.get('/status', legacySyncDisabled);

export default router;
