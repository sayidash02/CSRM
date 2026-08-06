import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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
      res.status(200).json({ data: { ...reactivated, id: reactivated.id.toString() } });
      return;
    }

    const pic = await prisma.pics.create({ data: { name: cleanName, is_active: true } });
    res.status(201).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const cleanName = name.trim();

    const pic = await prisma.pics.update({
      where: { id: BigInt(id as string) },
      data: { name: cleanName }
    });
    res.status(200).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
        return;
      }
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'PIC tidak ditemukan' });
        return;
      }
    }
    console.error(error);
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'PIC tidak ditemukan' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

