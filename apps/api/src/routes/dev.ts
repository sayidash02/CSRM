import { Router } from 'express';
import { devReset } from '../controllers/DevController';

const router = Router();

if (process.env.NODE_ENV === 'production') {
  router.all('*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
} else {
  router.delete('/reset', devReset);
}

export default router;
