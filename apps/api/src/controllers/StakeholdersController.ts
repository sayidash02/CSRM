import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createStakeholder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stakeholder, date, venue, concern_issue, document_link } = req.body;

    if (!stakeholder) {
      res.status(400).json({ error: 'Missing required fields: stakeholder' });
      return;
    }

    if (typeof stakeholder !== 'string' || stakeholder.trim() === '') {
      res.status(400).json({ error: 'Invalid field: stakeholder must be a non-empty string' });
      return;
    }

    const result = await prisma.stakeholder_engagement.create({
      data: {
        stakeholder,
        date: date ? new Date(date) : null,
        venue,
        concern_issue,
        document_link
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStakeholders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const where: any = { is_deleted: false, is_archived: false };
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
    
    const serialized = stakeholders.map(s => ({
      ...s,
      id: s.id.toString(),
      date: s.date ? s.date.toISOString().split('T')[0] : null
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteStakeholder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.stakeholder_engagement.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStakeholder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stakeholder, date, venue, concern_issue, document_link } = req.body;

    if (!stakeholder) {
      res.status(400).json({ error: 'Missing required fields: stakeholder' });
      return;
    }

    const result = await prisma.stakeholder_engagement.update({
      where: { id: BigInt(id as string) },
      data: {
        stakeholder,
        date: date ? new Date(date) : null,
        venue,
        concern_issue,
        document_link
      }
    });

    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
