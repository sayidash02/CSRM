import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { previewImport, confirmImport } from '../controllers/ImportController';
import { IMPORT_UPLOAD_DIR } from '../services/ImportFileStore';

const uploadDir = IMPORT_UPLOAD_DIR;

const upload = multer({
  dest: uploadDir,
  fileFilter: (_req, file, callback) => {
    const allowedExtension = /\.(xlsx|xls)$/i.test(file.originalname);
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ].includes(file.mimetype);
    if (!allowedExtension || !allowedMime) {
      callback(new Error('Only .xlsx/.xls workbook files are allowed'));
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit to support full-year sheets with embedded media
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
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid workbook upload' });
      return;
    }
    next();
  });
}, previewImport);

router.post('/confirm', confirmImport);

export default router;
