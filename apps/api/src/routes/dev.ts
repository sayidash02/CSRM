import { Router } from 'express';
import { devReset } from '../controllers/DevController';

const router = Router();
const resetEnabled = process.env.NODE_ENV === 'test'
  || (process.env.NODE_ENV === 'development' && process.env.CRMS_ENABLE_DEV_RESET === 'true');

if (!resetEnabled) {
  router.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
} else {
  router.delete('/reset', devReset);
}

export default router;
