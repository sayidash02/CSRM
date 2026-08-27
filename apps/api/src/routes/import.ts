import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { previewImport, confirmImport } from '../controllers/ImportController';
import { IMPORT_UPLOAD_DIR } from '../services/ImportFileStore';
import { AppError, sendPublicError } from '../lib/errorHandler';

const uploadDir = IMPORT_UPLOAD_DIR;
const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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
      callback(new AppError('FILE_UPLOAD_ERROR', 400, 'Hanya file Excel .xlsx/.xls yang diizinkan'));
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: MAX_IMPORT_FILE_SIZE_BYTES,
  }
});

const router = Router();

router.post('/preview', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        sendPublicError(res, 400, 'FILE_UPLOAD_ERROR', 'Ukuran file Excel melebihi batas 5 MB');
        return;
      }
      if (err instanceof AppError) {
        sendPublicError(res, err.statusCode, err.code, err.message);
        return;
      }
      sendPublicError(res, 400, 'FILE_UPLOAD_ERROR', 'Gagal mengunggah file Excel');
      return;
    }
    next();
  });
}, previewImport);

router.post('/confirm', confirmImport);
router.post('/commit', confirmImport);

export default router;
