import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { include_deleted } = req.query;
  const isDeletedFilter = include_deleted === 'true';

  const stakeholders = await prisma.stakeholders.findMany({
    where: isDeletedFilter ? {} : { is_deleted: false },
    orderBy: { name: 'asc' }
  });

  res.status(200).json({ data: stakeholders });
});

export const getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sId = BigInt(id as string);

  const stakeholder = await prisma.stakeholders.findFirst({
    where: {
      id: sId,
      is_deleted: false
    },
    include: {
      daily_activities: {
        where: { is_deleted: false },
        include: {
          category: true,
          sub_category: true,
          pic: true
        }
      },
      stakeholder_engagement: {
        where: { is_deleted: false }
      }
    }
  });

  if (!stakeholder) {
    res.status(404).json({ error: 'Stakeholder not found' });
    return;
  }

  res.status(200).json({ data: stakeholder });
});

export const create = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { name, is_active } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required and cannot be empty' });
    return;
  }

  const cleanName = name.trim();

  const stakeholder = await prisma.stakeholders.create({
    data: {
      name: cleanName,
      is_active: is_active ?? true
    }
  });

  res.status(201).json({ data: stakeholder });
});

export const update = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sId = BigInt(id as string);

  const { name, is_active } = req.body;

  const dataToUpdate: Prisma.stakeholdersUpdateInput = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name cannot be empty' });
      return;
    }
    dataToUpdate.name = name.trim();
  }

  if (is_active !== undefined) {
    dataToUpdate.is_active = Boolean(is_active);
  }

  const updated = await prisma.stakeholders.update({
    where: { id: sId },
    data: dataToUpdate
  });

  res.status(200).json({ data: updated });
});

export const deleteStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sId = BigInt(id as string);

  const deleted = await prisma.stakeholders.update({
    where: { id: sId },
    data: { is_deleted: true }
  });

  res.status(200).json({ data: deleted });
});

export const restore = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sId = BigInt(id as string);

  const restored = await prisma.stakeholders.update({
    where: { id: sId },
    data: { is_deleted: false }
  });

  res.status(200).json({ data: restored });
});
