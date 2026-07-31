import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createLrp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { program, sharepoint_link } = req.body;

    if (!program || !sharepoint_link) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.lrp.create({
      data: {
        program,
        sharepoint_link
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLrps = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await prisma.lrp.findMany({
      where: { is_deleted: false }
    });
    
    const serialized = records.map(a => ({
      ...a,
      id: a.id.toString()
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLrp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { program, sharepoint_link } = req.body;

    if (!program || !sharepoint_link) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.lrp.update({
      where: { id: BigInt(id as string) },
      data: {
        program,
        sharepoint_link
      }
    });

    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLrp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.lrp.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
