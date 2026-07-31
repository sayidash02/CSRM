import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadDocument } from '../controllers/UploadController';

const router = Router();
// Use memory storage so we can get file.buffer and pass it to Graph SDK
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit at multer level too
  }
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
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
}, uploadDocument);

export default router;
