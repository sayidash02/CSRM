import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const createLrp = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { program, sharepoint_link, year } = req.body;

  if (!program || !sharepoint_link) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const parsedYear = parseInt(year);
  if (!year || isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
    res.status(400).json({ error: 'Field year wajib diisi dan harus berupa tahun valid (1900–2100)' });
    return;
  }

  const result = await prisma.lrp.create({
    data: {
      program,
      year: parsedYear,
      sharepoint_link
    }
  });

  res.status(201).json({ data: result });
});

export const getLrps = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const parsedYear = parseInt(year as string);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      res.status(400).json({ error: 'Parameter year tidak valid' });
      return;
    }
    where.year = parsedYear;
  }
  const records = await prisma.lrp.findMany({
    where
  });

  res.status(200).json({ data: records });
});

export const updateLrp = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { program, sharepoint_link, year } = req.body;

  if (!program || !sharepoint_link) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const updateData: any = { program, sharepoint_link };

  if (year !== undefined) {
    const parsedYear = parseInt(year);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      res.status(400).json({ error: 'Field year harus berupa tahun valid (1900–2100)' });
      return;
    }
    updateData.year = parsedYear;
  }

  const result = await prisma.lrp.update({
    where: { id: BigInt(id as string) },
    data: updateData
  });

  res.status(200).json({ data: result });
});

export const deleteLrp = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.lrp.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const restoreLrp = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.lrp.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});

