import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { previewImport, confirmImport } from '../controllers/ImportController';

const uploadDir = path.join(os.tmpdir(), 'crms-imports');

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const router = Router();

router.post('/preview', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: `File upload error: ${err.message}` });
        return;
      }
      res.status(500).json({ error: 'Unknown file upload error' });
      return;
    }
    next();
  });
}, previewImport);

router.post('/confirm', confirmImport);

export default router;
