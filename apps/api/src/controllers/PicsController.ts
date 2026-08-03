import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getPics = async (req: Request, res: Response): Promise<void> => {
  try {
    const pics = await prisma.pics.findMany({ where: { is_active: true } });
    res.status(200).json({ data: pics.map(p => ({ ...p, id: p.id.toString() })) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const pic = await prisma.pics.create({ data: { name, is_active: true } });
    res.status(201).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const pic = await prisma.pics.update({
      where: { id: BigInt(id as string) },
      data: { name }
    });
    res.status(200).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pic = await prisma.pics.update({
      where: { id: BigInt(id as string) },
      data: { is_active: false }
    });
    res.status(200).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
