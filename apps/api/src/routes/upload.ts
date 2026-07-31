import { Router } from 'express';
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

router.post('/', upload.single('file'), uploadDocument);

export default router;
