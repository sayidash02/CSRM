import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseDailyActivitiesExcel } from '../services/ExcelImportService';
import { DailyActivityMomExportService } from '../services/excel/DailyActivityMomExportService';
import { catchAsync } from '../lib/catchAsync';

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 },
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

const photoUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAllowedExt = file.originalname.match(/\.(jpg|jpeg|png|webp|gif|pdf|docx)$/i);
    if (!isAllowedExt) {
      return cb(new Error('Hanya file gambar (JPG, PNG, WEBP) atau PDF/Word yang diperbolehkan'));
    }
    cb(null, true);
  }
});

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

/**
 * Keep the legacy combined column available while treating the new
 * `keterangan` and `hasil` fields as the source of truth whenever either is
 * supplied by a client.
 */
const normalizeDailyActivityText = (body: Record<string, unknown>) => {
  const keterangan = normalizeText(body.keterangan);
  const hasil = normalizeText(body.hasil);
  const hasStructuredText = hasOwn(body, 'keterangan') || hasOwn(body, 'hasil');
  const description_result = hasStructuredText
    ? [keterangan, hasil].filter((value): value is string => Boolean(value)).join(' - ') || null
    : normalizeText(body.description_result);

  return { keterangan, hasil, description_result, hasStructuredText };
};

export const createDailyActivity = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { activity_date, activity, institution_group, address, focus, location, cost, document_link, pic_ids, pic_id, category_id, sub_category_id, kesimpulan, next_plan } = req.body;
  const dailyText = normalizeDailyActivityText(req.body);

  const rawPicIds = pic_ids || (pic_id ? [pic_id] : []);
  const resolvedPicIds = Array.isArray(rawPicIds) ? rawPicIds : [rawPicIds];

  if (!activity_date || !activity || resolvedPicIds.length === 0 || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const validPics = await prisma.pics.findMany({
    where: { id: { in: resolvedPicIds.map((id: any) => BigInt(id)) } }
  });
  
  if (validPics.length !== resolvedPicIds.length) {
    res.status(400).json({ error: 'Invalid pic_ids' });
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
      keterangan: dailyText.keterangan,
      hasil: dailyText.hasil,
      kesimpulan: normalizeText(kesimpulan),
      next_plan: normalizeText(next_plan),
      description_result: dailyText.description_result,
      document_link,
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id),
      daily_activity_pics: {
        create: resolvedPicIds.map((id: any) => ({
          pic_id: BigInt(id)
        }))
      }
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
      { location: { contains: q } },
      { institution_group: { contains: q } },
      { address: { contains: q } },
      { focus: { contains: q } },
      { keterangan: { contains: q } },
      { hasil: { contains: q } },
      { kesimpulan: { contains: q } },
      { next_plan: { contains: q } }
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
      case 'address':
      case 'cost':
      case 'keterangan':
      case 'hasil':
      case 'kesimpulan':
      case 'next_plan':
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
        orderByConfig = { activity_date: 'desc' };
        break;
      default:
        orderByConfig = { activity_date: 'desc' };
    }
  }

  const include = { daily_activity_pics: { include: { pic: true } }, category: true, sub_category: true };

  if (no_paginate === 'true') {
    const activities = await prisma.daily_activities.findMany({ where, include, orderBy: orderByConfig });
    const formattedActivities = activities.map((a: any) => ({
      ...a,
      pics: a.daily_activity_pics?.map((dap: any) => dap.pic) || []
    }));
    res.status(200).json({ data: formattedActivities });
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
  
  const formattedActivities = activities.map((a: any) => ({
    ...a,
    pics: a.daily_activity_pics?.map((dap: any) => dap.pic) || []
  }));

  res.status(200).json({ 
    data: formattedActivities,
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
  const { activity_date, activity, institution_group, address, focus, location, cost, document_link, pic_ids, pic_id, category_id, sub_category_id, kesimpulan, next_plan } = req.body;
  const dailyText = normalizeDailyActivityText(req.body);

  if (!activity_date || !activity || (!pic_ids && !pic_id) || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const rawPicIds = pic_ids || (pic_id ? [pic_id] : []);
  const normalizedPicIds = Array.isArray(rawPicIds) ? rawPicIds : [rawPicIds];

  const oldActivity = await prisma.daily_activities.findUnique({
    where: { id: BigInt(id as string) },
    include: { daily_activity_pics: { include: { pic: true } } }
  });

  const newPics = await prisma.pics.findMany({
    where: { id: { in: normalizedPicIds.map((pid: any) => BigInt(pid)) } }
  });

  if (newPics.length !== normalizedPicIds.length) {
    res.status(400).json({ error: 'Invalid pic_ids' });
    return;
  }

  if (oldActivity) {
    const oldPicNames = oldActivity.daily_activity_pics.map(dap => dap.pic.name).sort().join(', ');
    const newPicNames = newPics.map(p => p.name).sort().join(', ');

    if (oldPicNames !== newPicNames) {
      await prisma.audit_logs.create({
        data: {
          entity_type: 'daily_activities',
          entity_id: BigInt(id as string),
          action: 'UPDATE',
          changes: {
            pic_id: {
              old: oldPicNames,
              new: newPicNames
            }
          }
        }
      });
    }
  }

  const textUpdate = dailyText.hasStructuredText
    ? {
        keterangan: dailyText.keterangan,
        hasil: dailyText.hasil,
        description_result: dailyText.description_result
      }
    : hasOwn(req.body, 'description_result')
      ? { description_result: dailyText.description_result }
      : {};

  const extraFields: Record<string, unknown> = {};
  if (hasOwn(req.body, 'kesimpulan')) extraFields.kesimpulan = normalizeText(kesimpulan);
  if (hasOwn(req.body, 'next_plan')) extraFields.next_plan = normalizeText(next_plan);

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
      document_link,
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id),
      ...textUpdate,
      ...extraFields,
      daily_activity_pics: {
        deleteMany: {},
        create: normalizedPicIds.map((pid: any) => ({ pic_id: BigInt(pid) }))
      }
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
      const pIds = Array.isArray(r.pic_ids) ? r.pic_ids : (r.pic_id ? [r.pic_id] : []);
      if (!r.category_id || !r.sub_category_id || pIds.length === 0) {
        const err: any = new Error('Field referensi (category_id, sub_category_id, pic_ids) wajib diisi untuk setiap baris');
        err.status = 400;
        throw err;
      }

      const dailyTextBody: Record<string, unknown> = {
        description_result: r.description_result
      };
      if (hasOwn(r, 'keterangan')) dailyTextBody.keterangan = r.keterangan;
      if (hasOwn(r, 'hasil')) dailyTextBody.hasil = r.hasil;
      const dailyText = normalizeDailyActivityText(dailyTextBody);
      
      await tx.daily_activities.create({
        data: {
          activity_date: new Date(r.activity_date),
          activity: String(r.activity || ''),
          institution_group: r.institution_group ? String(r.institution_group) : null,
          address: String(r.address || ''),
          category_id: BigInt(r.category_id),
          sub_category_id: BigInt(r.sub_category_id),
          daily_activity_pics: {
            create: pIds.map((id: any) => ({ pic_id: BigInt(id) }))
          },
          focus: String(r.focus || ''),
          location: String(r.location || ''),
          cost: Number(r.cost) || 0,
          keterangan: dailyText.keterangan,
          hasil: dailyText.hasil,
          kesimpulan: normalizeText(r.kesimpulan),
          next_plan: normalizeText(r.next_plan),
          description_result: dailyText.description_result,
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

export const exportSingleMom = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'ID kegiatan wajib disertakan' });
    return;
  }
  const { buffer, fileName } = await DailyActivityMomExportService.generateSingleMomBuffer(id as string);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.status(200).send(buffer);
});

export const exportMomWorkbook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted, search, cat, sub_cat, start, end } = req.query;
  const { buffer, fileName, count } = await DailyActivityMomExportService.generateMomWorkbookBuffer({
    year: year as string,
    is_deleted: is_deleted === 'true',
    search: search as string,
    cat: cat as string,
    sub_cat: sub_cat as string,
    start: start as string,
    end: end as string
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.setHeader('X-Total-Count', String(count));
  res.status(200).send(buffer);
});

export const uploadPhoto = (req: Request, res: Response, next: NextFunction) => {
  photoUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    try {
      const { activity_date, pic_name } = req.body;
      const actDate = activity_date ? new Date(activity_date) : new Date();
      const finalPic = pic_name || 'User';

      const year = isNaN(actDate.getTime()) ? new Date().getFullYear() : actDate.getFullYear();
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const month = monthNames[isNaN(actDate.getTime()) ? new Date().getMonth() : actDate.getMonth()];
      const day = isNaN(actDate.getTime()) ? new Date().getDate() : actDate.getDate();
      const weekNumber = Math.ceil(day / 7);

      const targetSubDir = path.join('0. Testing', String(year), month, `Week ${weekNumber}`);
      const baseMockDir = path.resolve(process.cwd(), '.sharepoint_mock');
      const fullDirPath = path.join(baseMockDir, targetSubDir);
      await fs.promises.mkdir(fullDirPath, { recursive: true });

      const datePrefix = `${year}${String((isNaN(actDate.getTime()) ? new Date().getMonth() : actDate.getMonth()) + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
      const safePic = finalPic.replace(/[^a-zA-Z0-9]/g, '_');
      const safeFileName = `${datePrefix}_${safePic}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fullFilePath = path.join(fullDirPath, safeFileName);

      await fs.promises.writeFile(fullFilePath, req.file.buffer);

      const relativeUrl = `/uploads/${targetSubDir.replace(/\\/g, '/')}/${safeFileName}`;
      res.status(200).json({ data: { url: relativeUrl, path: fullFilePath } });
    } catch (error: any) {
      next(error);
    }
  });
};
