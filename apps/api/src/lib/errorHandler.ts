import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error]', err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Data duplikat telah ada' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Referensi ID (Foreign Key) tidak valid atau tidak ditemukan' });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Format data tidak valid' });
  }

  // Fallback for other errors
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};
