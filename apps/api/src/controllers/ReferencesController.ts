import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const pics = await prisma.pics.findMany({ where: { is_active: true } });
    const categories = await prisma.categories.findMany();
    const sub_categories = await prisma.sub_categories.findMany();

    const serializedPics = pics.map(p => ({ ...p, id: p.id.toString() }));
    const serializedCategories = categories.map(c => ({ ...c, id: c.id.toString() }));
    const serializedSubCategories = sub_categories.map(s => ({ ...s, id: s.id.toString(), category_id: s.category_id.toString() }));

    res.status(200).json({
      data: {
        pics: serializedPics,
        categories: serializedCategories,
        sub_categories: serializedSubCategories
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
