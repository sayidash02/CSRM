import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { parseDailyActivitiesExcel } from '../services/ExcelImportService';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

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

export const importParseExcel = (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 400, message: 'Upload error: ' + err.message });
    if (!req.file) return res.status(400).json({ status: 400, message: 'File is required' });

    try {
      const result = await parseDailyActivitiesExcel(req.file.buffer);
      res.json({ status: 200, data: result });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: 500, message: 'Failed to parse Excel: ' + error.message });
    }
  });
};

export const importCommitExcel = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ status: 400, message: 'No valid rows provided' });
    }

    const dataToInsert = rows.map((r: any) => ({
      activity_date: new Date(r.activity_date),
      activity: r.activity,
      institution_group: r.institution_group || '',
      address: r.address || '',
      category_id: BigInt(r.category_id),
      sub_category_id: BigInt(r.sub_category_id),
      focus: r.focus || '',
      location: r.location || '',
      cost: Number(r.cost) || 0,
      description_result: r.description_result || '',
      document_link: r.document_link || '',
      pic_id: BigInt(r.pic_id),
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const result = await prisma.daily_activities.createMany({
      data: dataToInsert
    });

    res.json({ status: 200, data: { count: result.count } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Internal Server Error: ' + error.message });
  }
};

