import { Router } from 'express';

const router = Router();

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

// Placeholder for controller
router.delete('/reset', (req, res) => {
  res.status(200).json({ message: 'Reset successful' });
});

export default router;
