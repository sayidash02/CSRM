import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const getPics = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { all } = req.query;
  const where = all === 'true' ? {} : { is_active: true };
  const pics = await prisma.pics.findMany({
    where,
    orderBy: { name: 'asc' }
  });
  res.status(200).json({ data: pics.map(p => ({ ...p, id: p.id.toString(), is_active: p.is_active })) });
});

export const createPic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const cleanName = name.trim();

  // Check if PIC with this name already exists in database
  const existingPic = await prisma.pics.findFirst({
    where: { name: cleanName }
  });

  if (existingPic) {
    if (existingPic.is_active) {
      res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
      return;
    }
    // Reactivate soft-deleted PIC
    const reactivated = await prisma.pics.update({
      where: { id: existingPic.id },
      data: { is_active: true }
    });
    res.status(200).json({ data: { ...reactivated, id: reactivated.id.toString(), is_active: reactivated.is_active } });
    return;
  }

  const pic = await prisma.pics.create({ data: { name: cleanName, is_active: true } });
  res.status(201).json({ data: { ...pic, id: pic.id.toString(), is_active: pic.is_active } });
});

export const updatePic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, is_active } = req.body;
  const data: any = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    data.name = name.trim();
  }
  if (is_active !== undefined) {
    data.is_active = Boolean(is_active);
  }

  const pic = await prisma.pics.update({
    where: { id: BigInt(id as string) },
    data
  });
  res.status(200).json({ data: { ...pic, id: pic.id.toString(), is_active: pic.is_active } });
});

export const deletePic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const pic = await prisma.pics.update({
    where: { id: BigInt(id as string) },
    data: { is_active: false }
  });
  res.status(200).json({ data: { ...pic, id: pic.id.toString(), is_active: pic.is_active } });
});


