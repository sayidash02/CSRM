import { Request, Response } from 'express';
import prisma from '../lib/prisma';

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

export const getDailyActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const activities = await prisma.daily_activities.findMany({
      where: { is_deleted: false },
      include: { pic: true, category: true, sub_category: true }
    });
    
    const serialized = activities.map(a => ({
      ...a,
      id: a.id.toString(),
      pic_id: a.pic_id?.toString(),
      category_id: a.category_id?.toString(),
      sub_category_id: a.sub_category_id?.toString(),
      pic: a.pic ? { ...a.pic, id: a.pic.id.toString() } : null,
      category: a.category ? { ...a.category, id: a.category.id.toString() } : null,
      sub_category: a.sub_category ? { ...a.sub_category, id: a.sub_category.id.toString() } : null
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.daily_activities.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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

    const result = await prisma.daily_activities.update({
      where: { id: BigInt(id as string) },
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

    res.status(200).json({ data: { ...result, id: result.id.toString(), pic_id: result.pic_id.toString(), category_id: result.category_id.toString(), sub_category_id: result.sub_category_id.toString(), cost: result.cost?.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
