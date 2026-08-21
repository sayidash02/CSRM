import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { parseDailyActivitiesExcel } from '../services/ExcelImportService';
import { DailyActivityMomExportService } from '../services/excel/DailyActivityMomExportService';
import { MomDocumentExportService, MomExportFilters } from '../services/mom/MomDocumentExportService';
import { catchAsync } from '../lib/catchAsync';
import { makeDailyActivityIdentity } from '../services/excel/ImportIdentity';
import { mergeImportedRows } from '../services/excel/ImportDuplicateGuard';

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
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAllowedExt = file.originalname.match(/\.(jpg|jpeg|png)$/i);
    const allowedMimeTypes = [
      'image/jpeg', 'image/png',
    ];
    if (!isAllowedExt || !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Hanya file foto JPG/JPEG atau PNG yang diperbolehkan'));
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

const parseId = (value: unknown): bigint => {
  if (typeof value === 'bigint') return value;
  if (typeof value !== 'string' && typeof value !== 'number') {
    const error: any = new Error('ID referensi tidak valid');
    error.status = 400;
    throw error;
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    const error: any = new Error('ID referensi tidak valid');
    error.status = 400;
    throw error;
  }
  return BigInt(text);
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
  const { activity_date, activity, institution_group, address, focus, location, cost, pic_ids, pic_id, category_id, sub_category_id, kesimpulan, next_plan } = req.body;
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

  const include = {
    daily_activity_pics: { include: { pic: true } },
    category: true,
    sub_category: true,
    photos: {
      where: { is_deleted: false },
      select: { id: true, original_name: true, mime_type: true, size_bytes: true, sort_order: true },
      orderBy: { sort_order: 'asc' as const }
    }
  };

  if (no_paginate === 'true') {
    const activities = await prisma.daily_activities.findMany({ where, include, orderBy: orderByConfig });
    const formattedActivities = activities.map((a: any) => ({
      ...a,
      pics: a.daily_activity_pics?.map((dap: any) => dap.pic) || [],
      photos: a.photos?.map((photo: any) => ({ ...photo, url: `/api/daily-activities/${a.id}/photos/${photo.id}` })) || []
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
    pics: a.daily_activity_pics?.map((dap: any) => dap.pic) || [],
    photos: a.photos?.map((photo: any) => ({ ...photo, url: `/api/daily-activities/${a.id}/photos/${photo.id}` })) || []
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
  const { activity_date, activity, institution_group, address, focus, location, cost, pic_ids, pic_id, category_id, sub_category_id, kesimpulan, next_plan } = req.body;
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

  const normalizedRows = rows.map((r: any, index: number) => {
    const activityDate = new Date(r.activity_date);
    const pIdsRaw = Array.isArray(r.pic_ids) ? r.pic_ids : (r.pic_id ? [r.pic_id] : []);
    const pIds = pIdsRaw.map((id: unknown) => parseId(id));
    const categoryId = parseId(r.category_id);
    const subCategoryId = parseId(r.sub_category_id);
    const cost = r.cost === undefined || r.cost === null || r.cost === '' ? null : Number(r.cost);
    if (Number.isNaN(activityDate.getTime()) || !String(r.activity || '').trim() || pIds.length === 0 || categoryId <= 0n || subCategoryId <= 0n || (cost !== null && !Number.isFinite(cost))) {
      const error: any = new Error(`Baris ${index + 1} tidak valid; tidak ada default data yang diterapkan`);
      error.status = 400;
      throw error;
    }
    const dailyTextBody: Record<string, unknown> = { description_result: r.description_result };
    if (hasOwn(r, 'keterangan')) dailyTextBody.keterangan = r.keterangan;
    if (hasOwn(r, 'hasil')) dailyTextBody.hasil = r.hasil;
    return {
      activity_date: activityDate,
      activity: String(r.activity).trim(),
      institution_group: normalizeText(r.institution_group),
      address: normalizeText(r.address),
      focus: normalizeText(r.focus),
      location: normalizeText(r.location),
      keterangan: normalizeDailyActivityText(dailyTextBody).keterangan,
      hasil: normalizeDailyActivityText(dailyTextBody).hasil,
      description_result: normalizeDailyActivityText(dailyTextBody).description_result,
      kesimpulan: normalizeText(r.kesimpulan),
      next_plan: normalizeText(r.next_plan),
      cost,
      category_id: categoryId,
      sub_category_id: subCategoryId,
      pic_ids: pIds,
    };
  });

  const [categories, subCategories, pics] = await Promise.all([
    prisma.categories.findMany({ where: { id: { in: normalizedRows.map((row) => row.category_id) } } }),
    prisma.sub_categories.findMany({ where: { id: { in: normalizedRows.map((row) => row.sub_category_id) } } }),
    prisma.pics.findMany({ where: { id: { in: normalizedRows.flatMap((row) => row.pic_ids) } } }),
  ]);
  const categoryIds = new Set(categories.map((row) => String(row.id)));
  const subCategoryMap = new Map(subCategories.map((row) => [String(row.id), String(row.category_id)]));
  const picIds = new Set(pics.map((row) => String(row.id)));
  for (const row of normalizedRows) {
    if (!categoryIds.has(String(row.category_id)) || subCategoryMap.get(String(row.sub_category_id)) !== String(row.category_id) || row.pic_ids.some((id: bigint) => !picIds.has(String(id)))) {
      const error: any = new Error('Referensi kategori, sub-kategori, atau PIC tidak valid');
      error.status = 400;
      throw error;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.daily_activities.findMany({ where: { is_deleted: false }, include: { daily_activity_pics: { select: { pic_id: true } } } });
    const mergeResult = await mergeImportedRows({
      existing,
      incoming: normalizedRows,
      getIncomingIdentity: (row) => makeDailyActivityIdentity(row, row.category_id, row.sub_category_id, row.pic_ids),
      getExistingIdentities: (row) => [makeDailyActivityIdentity(row, row.category_id, row.sub_category_id, row.daily_activity_pics.map((pic) => pic.pic_id))],
      create: (row) => tx.daily_activities.create({
        data: {
          activity_date: row.activity_date,
          activity: row.activity,
          institution_group: row.institution_group,
          address: row.address,
          category_id: row.category_id,
          sub_category_id: row.sub_category_id,
          daily_activity_pics: { create: row.pic_ids.map((id: bigint) => ({ pic_id: id })) },
          focus: row.focus,
          location: row.location,
          cost: row.cost,
          keterangan: row.keterangan,
          hasil: row.hasil,
          kesimpulan: row.kesimpulan,
          next_plan: row.next_plan,
          description_result: row.description_result,
        },
        include: { daily_activity_pics: { select: { pic_id: true } } },
      }),
      mergeExisting: async () => undefined,
    });
    return { count: mergeResult.created + mergeResult.merged };
  });

  res.json({ status: 200, data: { count: result.count } });
});

export const exportSingleMom = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'ID kegiatan wajib disertakan' });
    return;
  }
  const format = String(req.query.format || 'xlsx').toLowerCase();
  if (!['xlsx', 'docx', 'pdf'].includes(format)) {
    res.status(400).json({ error: 'Format MOM harus xlsx, docx, atau pdf', code: 'BAD_REQUEST' });
    return;
  }

  const result = format === 'docx'
    ? await MomDocumentExportService.generateSingleDocxBuffer(id as string)
    : format === 'pdf'
      ? await MomDocumentExportService.generateSinglePdfBuffer(id as string)
      : await DailyActivityMomExportService.generateSingleMomBuffer(id as string);
  const contentType = format === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.setHeader('Content-Length', result.buffer.byteLength);
  res.status(200).send(result.buffer);
});

export const exportMomWorkbook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted, search, cat, sub_cat, start, end } = req.query;
  const options: MomExportFilters = {
    year: year as string,
    is_deleted: is_deleted === 'true',
    search: search as string,
    cat: cat as string,
    sub_cat: sub_cat as string,
    start: start as string,
    end: end as string,
  };
  const format = String(req.query.format || 'xlsx').toLowerCase();
  if (!['xlsx', 'docx', 'pdf'].includes(format)) {
    res.status(400).json({ error: 'Format MOM harus xlsx, docx, atau pdf', code: 'BAD_REQUEST' });
    return;
  }
  const result = format === 'docx'
    ? await MomDocumentExportService.generateCombinedDocxBuffer(options)
    : format === 'pdf'
      ? await MomDocumentExportService.generateCombinedPdfBuffer(options)
      : await DailyActivityMomExportService.generateMomWorkbookBuffer(options);
  const contentType = format === 'docx'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.setHeader('Content-Length', result.buffer.byteLength);
  if ('count' in result) res.setHeader('X-Total-Count', String(result.count));
  res.status(200).send(result.buffer);
});

export const uploadPhoto = (req: Request, res: Response, next: NextFunction) => {
  photoUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    try {
      const activityId = parseId(req.body?.activity_id);
      const buffer = req.file.buffer;
      const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const matchesMime = (req.file.mimetype === 'image/jpeg' && isJpeg) || (req.file.mimetype === 'image/png' && isPng);
      if (!matchesMime) {
        res.status(400).json({ error: 'Isi file tidak cocok dengan tipe gambar yang diklaim' });
        return;
      }

      const activity = await prisma.daily_activities.findFirst({
        where: { id: activityId, is_deleted: false },
        select: { id: true }
      });
      if (!activity) {
        res.status(404).json({ error: 'Kegiatan tidak ditemukan' });
        return;
      }

      const lastPhoto = await prisma.daily_activity_photos.findFirst({
        where: { activity_id: activityId },
        orderBy: { sort_order: 'desc' },
        select: { sort_order: true }
      });
      const digest = createHash('sha256').update(buffer).digest('hex');
      const photo = await prisma.daily_activity_photos.create({
        data: {
          activity_id: activityId,
          photo_data: buffer,
          mime_type: req.file.mimetype,
          original_name: req.file.originalname.slice(0, 255),
          size_bytes: buffer.length,
          sha256: digest,
          sort_order: (lastPhoto?.sort_order ?? -1) + 1
        },
        select: { id: true, activity_id: true, original_name: true, mime_type: true, size_bytes: true, sort_order: true }
      });
      res.status(201).json({ data: { ...photo, url: `/api/daily-activities/${activityId}/photos/${photo.id}` } });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ error: 'Foto yang sama sudah terpasang pada kegiatan ini' });
        return;
      }
      next(error);
    }
  });
};

export const getPhoto = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const activityId = parseId(req.params.id);
  const photoId = parseId(req.params.photoId);
  const photo = await prisma.daily_activity_photos.findFirst({
    where: { id: photoId, activity_id: activityId, is_deleted: false },
    select: { photo_data: true, mime_type: true, original_name: true, size_bytes: true }
  });
  if (!photo) {
    res.status(404).json({ error: 'Foto tidak ditemukan' });
    return;
  }
  res.setHeader('Content-Type', photo.mime_type);
  res.setHeader('Content-Length', String(photo.size_bytes));
  res.setHeader('Content-Disposition', `inline; filename="${photo.original_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  res.status(200).send(Buffer.from(photo.photo_data));
});

export const deletePhoto = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const activityId = parseId(req.params.id);
  const photoId = parseId(req.params.photoId);
  const result = await prisma.daily_activity_photos.updateMany({
    where: { id: photoId, activity_id: activityId, is_deleted: false },
    data: { is_deleted: true }
  });
  if (result.count === 0) { res.status(404).json({ error: 'Foto tidak ditemukan' }); return; }
  res.status(204).send();
});
