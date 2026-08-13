import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseDailyActivitiesExcel } from '../services/ExcelImportService';
import { catchAsync } from '../lib/catchAsync';

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

export const createDailyActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_id, category_id, sub_category_id } = req.body;

  if (!activity_date || !activity || !pic_id || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const pic = await prisma.pics.findUnique({
    where: { id: BigInt(pic_id) }
  });
  
  if (!pic) {
    res.status(400).json({ error: 'Invalid pic_id' });
    return;
  }

  const result = await prisma.daily_activities.create({
    data: {
      activity_date: new Date(activity_date),
      activity,
      institution_group: institution_group ?? req.body.stakeholder ?? null,
      address,
      focus,
      location,
      cost: cost !== undefined && cost !== null ? Number(cost) : null,
      description_result,
      document_link,
      pic_id: BigInt(pic_id),
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id)
    }
  });

  res.status(201).json({ data: result });
});

export const getDailyActivities = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted, page, limit, search, cat, sub_cat, start, end, no_paginate, sort_by, sort_dir } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  
  if (year && year !== 'Semua' && year !== 'All' && !isNaN(parseInt(year as string))) {
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
      { location: { contains: q } }
    ];
  }

  let orderByConfig: Prisma.daily_activitiesOrderByWithRelationInput = { activity_date: 'desc' };

  if (sort_by) {
    const dir: Prisma.SortOrder = sort_dir === 'asc' ? 'asc' : 'desc';
    
    switch(sort_by as string) {
      case 'activity_date':
      case 'activity':
      case 'focus':
      case 'location':
      case 'cost':
      case 'description_result':
        orderByConfig = { [sort_by as string]: dir };
        break;
      case 'institution_group':
      case 'stakeholder':
      case 'stakeholder_name':
      case 'stakeholder.name':
        orderByConfig = { institution_group: dir };
        break;
      case 'category':
      case 'category_name':
      case 'category.name':
        orderByConfig = { category: { name: dir } };
        break;
      case 'sub_category':
      case 'sub_category_name':
      case 'sub_category.name':
        orderByConfig = { sub_category: { name: dir } };
        break;
      case 'pics':
      case 'pic':
      case 'pic_name':
      case 'pic.name':
        orderByConfig = { pic: { name: dir } };
        break;
      default:
        orderByConfig = { activity_date: 'desc' };
    }
  }

  const include = { pic: true, category: true, sub_category: true };

  if (no_paginate === 'true') {
    const activities = await prisma.daily_activities.findMany({ where, include, orderBy: orderByConfig });
    res.status(200).json({ data: activities });
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
      orderBy: orderByConfig
    }),
    prisma.daily_activities.count({ where })
  ]);
  
  res.status(200).json({ 
    data: activities,
    meta: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum)
    }
  });
});

export const deleteDailyActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.daily_activities.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const restoreDailyActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.daily_activities.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});

export const updateDailyActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_id, category_id, sub_category_id } = req.body;

  if (!activity_date || !activity || !pic_id || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const pic = await prisma.pics.findUnique({
    where: { id: BigInt(pic_id) }
  });
  
  if (!pic) {
    res.status(400).json({ error: 'Invalid pic_id' });
    return;
  }

  const result = await prisma.daily_activities.update({
    where: { id: BigInt(id as string) },
    data: {
      activity_date: new Date(activity_date),
      activity,
      institution_group: institution_group ?? req.body.stakeholder ?? null,
      address,
      focus,
      location,
      cost: cost !== undefined && cost !== null ? Number(cost) : null,
      description_result,
      document_link,
      pic_id: BigInt(pic_id),
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id)
    }
  });

  res.status(200).json({ data: result });
});

export const importParseExcel = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 400, message: 'Upload error: ' + err.message });
    if (!req.file) return res.status(400).json({ status: 400, message: 'File is required' });

    try {
      const result = await parseDailyActivitiesExcel(req.file.buffer);
      res.json({ status: 200, data: result });
    } catch (error: any) {
      next(error);
    }
  });
};

export const importCommitExcel = catchAsync(async (req: Request, res: Response) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'No valid rows provided' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const r of rows) {
      const picId = r.pic_id || (Array.isArray(r.pic_ids) ? r.pic_ids[0] : null);
      if (!r.category_id || !r.sub_category_id || !picId) {
        const err: any = new Error('Field referensi (category_id, sub_category_id, pic_id) wajib diisi untuk setiap baris');
        err.status = 400;
        throw err;
      }
      
      await tx.daily_activities.create({
        data: {
          activity_date: new Date(r.activity_date),
          activity: String(r.activity || ''),
          institution_group: r.institution_group ? String(r.institution_group) : null,
          address: String(r.address || ''),
          category_id: BigInt(r.category_id),
          sub_category_id: BigInt(r.sub_category_id),
          pic_id: BigInt(picId),
          focus: String(r.focus || ''),
          location: String(r.location || ''),
          cost: Number(r.cost) || 0,
          description_result: String(r.description_result || ''),
          document_link: String(r.document_link || ''),
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      count++;
    }
    return { count };
  });

  res.json({ status: 200, data: { count: result.count } });
});

