import { Request, Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseDailyActivitiesExcel } from '../services/ExcelImportService';

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isExcelExt = file.originalname.match(/\.(xlsx|xls)$/i);
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    if (!isExcelExt || !validMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Hanya file Excel (.xlsx, .xls) yang diperbolehkan'));
    }
    cb(null, true);
  }
});

function handleControllerError(res: Response, error: any) {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Data duplikat telah ada' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Referensi ID (Foreign Key) tidak ditemukan' });
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Format data tidak valid' });
  }
  return res.status(500).json({ error: 'Internal Server Error' });
}

export const createDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_ids, category_id, sub_category_id } = req.body;

    if (!activity_date || !activity || !pic_ids || !Array.isArray(pic_ids) || pic_ids.length === 0 || !category_id || !sub_category_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pics = await prisma.pics.findMany({
      where: { id: { in: pic_ids.map((id: any) => BigInt(id)) } }
    });
    
    if (pics.length !== pic_ids.length) {
      res.status(400).json({ error: 'One or more invalid pic_ids' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const activityRecord = await tx.daily_activities.create({
        data: {
          activity_date: new Date(activity_date),
          activity,
          institution_group,
          address,
          focus,
          location,
          cost: cost !== undefined && cost !== null ? Number(cost) : null,
          description_result,
          document_link,
          category_id: BigInt(category_id),
          sub_category_id: BigInt(sub_category_id)
        }
      });

      const picLinks = pic_ids.map((picId: any) => ({
        daily_activity_id: activityRecord.id,
        pic_id: BigInt(picId)
      }));

      await tx.daily_activity_pics.createMany({
        data: picLinks
      });

      return activityRecord;
    });

    res.status(201).json({ data: result });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const getDailyActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, is_deleted, page, limit, search, cat, sub_cat, start, end, no_paginate } = req.query;
    const isDeletedFilter = is_deleted === 'true';
    const where: any = { is_deleted: isDeletedFilter, is_archived: false };
    
    if (year) {
      const y = year as string;
      where.activity_date = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lte: new Date(`${y}-12-31T23:59:59.999Z`)
      };
    }
    if (start && end) {
      where.activity_date = {
        gte: new Date(`${start}T00:00:00.000Z`),
        lte: new Date(`${end}T23:59:59.999Z`)
      };
    }
    if (cat && cat !== 'All') {
      where.category_id = BigInt(cat as string);
    }
    if (sub_cat && sub_cat !== 'All') {
      where.sub_category_id = BigInt(sub_cat as string);
    }
    if (search) {
      const q = search as string;
      where.OR = [
        { activity: { contains: q } },
        { institution_group: { contains: q } },
        { location: { contains: q } }
      ];
    }

    const include = { daily_activity_pics: { include: { pic: true } }, category: true, sub_category: true };

    if (no_paginate === 'true') {
      const activities = await prisma.daily_activities.findMany({ where, include, orderBy: { activity_date: 'desc' } });
      const mappedActivities = activities.map((act: any) => ({
        ...act,
        pics: act.daily_activity_pics.map((p: any) => p.pic),
        pic_ids: act.daily_activity_pics.map((p: any) => p.pic.id),
        daily_activity_pics: undefined
      }));
      res.status(200).json({ data: mappedActivities });
      return;
    }

    const pageNum = parseInt((page as string) || '1');
    const limitNum = parseInt((limit as string) || '50');
    const skip = (pageNum - 1) * limitNum;

    const [activities, totalItems] = await Promise.all([
      prisma.daily_activities.findMany({
        where,
        include,
        skip,
        take: limitNum,
        orderBy: { activity_date: 'desc' }
      }),
      prisma.daily_activities.count({ where })
    ]);
    
    const mappedActivities = activities.map((act: any) => ({
      ...act,
      pics: act.daily_activity_pics.map((p: any) => p.pic),
      pic_ids: act.daily_activity_pics.map((p: any) => p.pic.id),
      daily_activity_pics: undefined
    }));
    
    res.status(200).json({ 
      data: mappedActivities,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum)
      }
    });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const deleteDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.daily_activities.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: result });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const restoreDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.daily_activities.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const updateDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_ids, category_id, sub_category_id } = req.body;

    if (!activity_date || !activity || !pic_ids || !Array.isArray(pic_ids) || pic_ids.length === 0 || !category_id || !sub_category_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pics = await prisma.pics.findMany({
      where: { id: { in: pic_ids.map((id: any) => BigInt(id)) } }
    });
    
    if (pics.length !== pic_ids.length) {
      res.status(400).json({ error: 'One or more invalid pic_ids' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const activityRecord = await tx.daily_activities.update({
        where: { id: BigInt(id as string) },
        data: {
          activity_date: new Date(activity_date),
          activity,
          institution_group,
          address,
          focus,
          location,
          cost: cost !== undefined && cost !== null ? Number(cost) : null,
          description_result,
          document_link,
          category_id: BigInt(category_id),
          sub_category_id: BigInt(sub_category_id)
        }
      });

      await tx.daily_activity_pics.deleteMany({
        where: { daily_activity_id: BigInt(id as string) }
      });

      const picLinks = pic_ids.map((picId: any) => ({
        daily_activity_id: activityRecord.id,
        pic_id: BigInt(picId)
      }));

      await tx.daily_activity_pics.createMany({
        data: picLinks
      });

      return activityRecord;
    });

    res.status(200).json({ data: result });
  } catch (error) {
    handleControllerError(res, error);
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
      handleControllerError(res, error);
    }
  });
};

export const importCommitExcel = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const r of rows) {
        if (!r.category_id || !r.sub_category_id || !r.pic_ids || !Array.isArray(r.pic_ids) || r.pic_ids.length === 0) {
          throw new Error('Field referensi (category_id, sub_category_id, pic_ids) wajib diisi untuk setiap baris');
        }
        
        await tx.daily_activities.create({
          data: {
            activity_date: new Date(r.activity_date),
            activity: String(r.activity || ''),
            institution_group: String(r.institution_group || ''),
            address: String(r.address || ''),
            category_id: BigInt(r.category_id),
            sub_category_id: BigInt(r.sub_category_id),
            focus: String(r.focus || ''),
            location: String(r.location || ''),
            cost: Number(r.cost) || 0,
            description_result: String(r.description_result || ''),
            document_link: String(r.document_link || ''),
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
            daily_activity_pics: {
              create: r.pic_ids.map((picId: string | number) => ({
                pic_id: BigInt(picId)
              }))
            }
          }
        });
        count++;
      }
      return { count };
    });

    res.json({ status: 200, data: { count: result.count } });
  } catch (error: any) {
    if (error.message && error.message.includes('Field referensi')) {
      return res.status(400).json({ error: error.message });
    }
    handleControllerError(res, error);
  }
};
