import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { normalizeSharepointLinks } from '../lib/linkUtils.ts';

function readYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value >= 1900 && value <= 2100 ? value : null;
  if (typeof value !== 'string' || !/^\d{4}$/.test(value.trim())) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

export const createLrp = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { program, year, sharepoint_links } = req.body;

  if (!program) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const parsedYear = readYear(year);
  if (parsedYear === null) {
    res.status(400).json({ error: 'Field year wajib diisi dan harus berupa tahun valid (1900–2100)' });
    return;
  }

  const normalizedLinks = normalizeSharepointLinks(sharepoint_links);

  const result = await prisma.lrp.create({
    data: {
      program,
      year: parsedYear,
      sharepoint_links: normalizedLinks ? (normalizedLinks as any) : undefined
    }
  });

  res.status(201).json({ data: result });
});

export const getLrps = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const parsedYear = readYear(year);
    if (parsedYear === null) {
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
  const { program, year, sharepoint_links } = req.body;

  if (!program) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const updateData: any = { program };

  if (year !== undefined) {
    const parsedYear = readYear(year);
    if (parsedYear === null) {
      res.status(400).json({ error: 'Field year harus berupa tahun valid (1900–2100)' });
      return;
    }
    updateData.year = parsedYear;
  }

  if (sharepoint_links !== undefined) {
    updateData.sharepoint_links = normalizeSharepointLinks(sharepoint_links);
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

