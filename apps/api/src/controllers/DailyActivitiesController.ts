import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_id, category_id, sub_category_id } = req.body;

    if (!activity_date || !activity || !pic_id || !category_id || !sub_category_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pic = await prisma.pics.findUnique({ where: { id: pic_id } });
    if (!pic) {
      res.status(400).json({ error: 'Invalid pic_id' });
      return;
    }

    const result = await prisma.daily_activities.create({
      data: {
        activity_date: new Date(activity_date),
        activity,
        institution_group,
        address,
        focus,
        location,
        cost,
        description_result,
        document_link,
        pic_id,
        category_id,
        sub_category_id
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString(), pic_id: result.pic_id.toString(), category_id: result.category_id.toString(), sub_category_id: result.sub_category_id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
