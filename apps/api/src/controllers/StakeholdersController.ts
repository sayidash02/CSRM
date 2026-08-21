import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const createStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { stakeholder, date, venue, concern_issue } = req.body;

  if (!stakeholder || (typeof stakeholder === 'string' && !stakeholder.trim())) {
    res.status(400).json({ error: 'Missing required field: stakeholder' });
    return;
  }

  const sName = typeof stakeholder === 'string' ? stakeholder.trim() : stakeholder;

  const result = await prisma.stakeholder_engagement.create({
    data: {
      stakeholder: sName,
      date: date ? new Date(date) : null,
      venue,
      concern_issue
    }
  });

  res.status(201).json({
    data: result
  });
});

export const getStakeholders = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const y = year as string;
    where.date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
  const stakeholders = await prisma.stakeholder_engagement.findMany({
    where
  });
  
  res.status(200).json({ data: stakeholders });
});

export const deleteStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const updateStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { stakeholder, date, venue, concern_issue } = req.body;

  const dataToUpdate: any = {
    date: date ? new Date(date) : null,
    venue,
    concern_issue
  };

  if (stakeholder !== undefined) {
    dataToUpdate.stakeholder = typeof stakeholder === 'string' ? stakeholder.trim() : stakeholder;
  }

  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: dataToUpdate
  });

  res.status(200).json({
    data: result
  });
});

export const restoreStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});

