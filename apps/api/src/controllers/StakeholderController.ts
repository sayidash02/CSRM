import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { include_deleted } = req.query;
    const isDeletedFilter = include_deleted === 'true';

    const stakeholders = await prisma.stakeholders.findMany({
      where: isDeletedFilter ? {} : { is_deleted: false },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ data: stakeholders });
  } catch (error) {
    console.error('Error fetching master stakeholders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let sId: bigint;
    try {
      sId = BigInt(id as string);
    } catch {
      res.status(400).json({ error: 'Invalid stakeholder ID' });
      return;
    }

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
  } catch (error) {
    console.error('Error fetching master stakeholder by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Stakeholder name already exists' });
      return;
    }
    console.error('Error creating master stakeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let sId: bigint;
    try {
      sId = BigInt(id as string);
    } catch {
      res.status(400).json({ error: 'Invalid stakeholder ID' });
      return;
    }

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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Stakeholder name already exists' });
        return;
      }
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Stakeholder not found' });
        return;
      }
    }
    console.error('Error updating master stakeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteStakeholder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let sId: bigint;
    try {
      sId = BigInt(id as string);
    } catch {
      res.status(400).json({ error: 'Invalid stakeholder ID' });
      return;
    }

    const deleted = await prisma.stakeholders.update({
      where: { id: sId },
      data: { is_deleted: true }
    });

    res.status(200).json({ data: deleted });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Stakeholder not found' });
      return;
    }
    console.error('Error deleting master stakeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let sId: bigint;
    try {
      sId = BigInt(id as string);
    } catch {
      res.status(400).json({ error: 'Invalid stakeholder ID' });
      return;
    }

    const restored = await prisma.stakeholders.update({
      where: { id: sId },
      data: { is_deleted: false }
    });

    res.status(200).json({ data: restored });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Stakeholder not found' });
      return;
    }
    console.error('Error restoring master stakeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
