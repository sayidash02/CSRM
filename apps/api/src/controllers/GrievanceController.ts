import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { generateRegistrationNumber } from '../services/RegistrationNumberService';

const SIGNIFICANCE_VALUES = new Set(['Low', 'Medium', 'High', 'Critical']);
const GRIEVANCE_STATUSES = new Set(['Open', 'On Progress', 'Resolved', 'Closed']);

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAllowedExt = file.originalname.match(/\.(jpg|jpeg|png|webp)$/i);
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (!isAllowedExt || !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Hanya file foto JPG/JPEG, PNG, atau WebP yang diperbolehkan'));
    }
    cb(null, true);
  }
});

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

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const createGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { 
    register_no,
    log_date, 
    complainant_name, 
    address, 
    phone, 
    category, 
    significance, 
    description, 
    location, 
    investigation, 
    resolution, 
    feedback, 
    status, 
    completion_date, 
    remarks
  } = req.body;

  const logDate = parseRequiredDate(log_date);
  if (!logDate || typeof complainant_name !== 'string' || !complainant_name.trim() || !SIGNIFICANCE_VALUES.has(significance) || (status && !GRIEVANCE_STATUSES.has(status))) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const userRegisterNo = typeof register_no === 'string' && register_no.trim() ? register_no.trim() : null;
  const finalRegisterNo = userRegisterNo || await generateRegistrationNumber('grievance', logDate);

  const existing = await prisma.grievance.findFirst({
    where: { register_no: finalRegisterNo, is_deleted: false }
  });
  if (existing) {
    res.status(409).json({ error: `No. Registrasi '${finalRegisterNo}' sudah digunakan.` });
    return;
  }

  const result = await prisma.grievance.create({
    data: {
      register_no: finalRegisterNo,
      log_date: logDate,
      complainant_name,
      address,
      phone,
      category,
      significance,
      description,
      location,
      investigation,
      resolution,
      feedback,
      status: status || 'Open',
      completion_date: completion_date ? new Date(completion_date) : null,
      remarks
    }
  });

  res.status(201).json({ data: result });
});

export const getGrievances = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const y = year as string;
    where.log_date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
  const grievances = await prisma.grievance.findMany({
    where,
    include: {
      photos: {
        where: { is_deleted: false },
        select: { id: true, original_name: true, mime_type: true, size_bytes: true, sort_order: true },
        orderBy: { sort_order: 'asc' }
      }
    },
    orderBy: { log_date: 'desc' }
  });
  
  const formatted = grievances.map((g: any) => ({
    ...g,
    photos: g.photos?.map((p: any) => ({ ...p, url: `/api/grievance/${g.id}/photos/${p.id}` })) || []
  }));

  res.status(200).json({ data: formatted });
});

export const updateGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    register_no,
    log_date, 
    complainant_name, 
    address, 
    phone, 
    category, 
    significance, 
    description, 
    location, 
    investigation, 
    resolution, 
    feedback, 
    status, 
    completion_date, 
    remarks
  } = req.body;

  const logDate = parseRequiredDate(log_date);
  if (!logDate || typeof complainant_name !== 'string' || !complainant_name.trim() || !SIGNIFICANCE_VALUES.has(significance) || (status && !GRIEVANCE_STATUSES.has(status))) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const targetId = BigInt(id as string);
  if (typeof register_no === 'string' && register_no.trim()) {
    const trimmed = register_no.trim();
    const conflict = await prisma.grievance.findFirst({
      where: { register_no: trimmed, id: { not: targetId }, is_deleted: false }
    });
    if (conflict) {
      res.status(409).json({ error: `No. Registrasi '${trimmed}' sudah digunakan oleh pengaduan lain.` });
      return;
    }
  }

  const result = await prisma.grievance.update({
    where: { id: targetId },
    data: {
      ...(typeof register_no === 'string' && register_no.trim() ? { register_no: register_no.trim() } : {}),
      log_date: logDate,
      complainant_name,
      address,
      phone,
      category,
      significance,
      description,
      location,
      investigation,
      resolution,
      feedback,
      status: status || 'Open',
      completion_date: completion_date ? new Date(completion_date) : null,
      remarks
    }
  });

  res.status(200).json({ data: result });
});

export const deleteGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.grievance.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const restoreGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.grievance.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});

export const uploadGrievancePhoto = (req: Request, res: Response, next: NextFunction) => {
  photoUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    try {
      const grievanceId = parseId(req.params.id || req.body?.grievance_id);
      const buffer = req.file.buffer;
      const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
      const matchesMime = (req.file.mimetype === 'image/jpeg' && isJpeg) || (req.file.mimetype === 'image/png' && isPng) || (req.file.mimetype === 'image/webp' && isWebp);
      if (!matchesMime) {
        res.status(400).json({ error: 'Isi file tidak cocok dengan tipe gambar yang diklaim' });
        return;
      }

      const grievance = await prisma.grievance.findFirst({
        where: { id: grievanceId, is_deleted: false },
        select: { id: true }
      });
      if (!grievance) {
        res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
        return;
      }

      const lastPhoto = await prisma.grievance_photos.findFirst({
        where: { grievance_id: grievanceId },
        orderBy: { sort_order: 'desc' },
        select: { sort_order: true }
      });
      const digest = createHash('sha256').update(buffer).digest('hex');

      const existingPhoto = await prisma.grievance_photos.findFirst({
        where: { grievance_id: grievanceId, sha256: digest }
      });

      if (existingPhoto) {
        if (!existingPhoto.is_deleted) {
          res.status(409).json({ error: 'Foto yang sama sudah terpasang pada pengaduan ini' });
          return;
        }

        const restoredPhoto = await prisma.grievance_photos.update({
          where: { id: existingPhoto.id },
          data: {
            is_deleted: false,
            photo_data: buffer,
            mime_type: req.file.mimetype,
            original_name: req.file.originalname.slice(0, 255),
            size_bytes: buffer.length,
            sort_order: (lastPhoto?.sort_order ?? -1) + 1
          },
          select: { id: true, grievance_id: true, original_name: true, mime_type: true, size_bytes: true, sort_order: true }
        });
        res.status(201).json({ data: { ...restoredPhoto, url: `/api/grievance/${grievanceId}/photos/${restoredPhoto.id}` } });
        return;
      }

      const photo = await prisma.grievance_photos.create({
        data: {
          grievance_id: grievanceId,
          photo_data: buffer,
          mime_type: req.file.mimetype,
          original_name: req.file.originalname.slice(0, 255),
          size_bytes: buffer.length,
          sha256: digest,
          sort_order: (lastPhoto?.sort_order ?? -1) + 1
        },
        select: { id: true, grievance_id: true, original_name: true, mime_type: true, size_bytes: true, sort_order: true }
      });

      const currentUser = (req as any).crmsUser;
      await prisma.audit_logs.create({
        data: {
          entity_type: 'grievance',
          entity_id: grievanceId,
          action: 'UPDATE',
          changes: {
            foto: {
              old: '-',
              new: `Tambah foto: ${req.file.originalname.slice(0, 255)}`
            }
          },
          actor_user_id: currentUser?.id && currentUser.id > 0n ? currentUser.id : null,
        }
      });

      res.status(201).json({ data: { ...photo, url: `/api/grievance/${grievanceId}/photos/${photo.id}` } });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ error: 'Foto yang sama sudah terpasang pada pengaduan ini' });
        return;
      }
      next(error);
    }
  });
};

export const getGrievancePhoto = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const grievanceId = parseId(req.params.id);
  const photoId = parseId(req.params.photoId);
  const photo = await prisma.grievance_photos.findFirst({
    where: { id: photoId, grievance_id: grievanceId, is_deleted: false },
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

export const deleteGrievancePhoto = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const grievanceId = parseId(req.params.id);
  const photoId = parseId(req.params.photoId);

  const existingPhoto = await prisma.grievance_photos.findFirst({
    where: { id: photoId, grievance_id: grievanceId, is_deleted: false },
    select: { id: true, original_name: true }
  });
  if (!existingPhoto) {
    res.status(404).json({ error: 'Foto tidak ditemukan' });
    return;
  }

  await prisma.grievance_photos.update({
    where: { id: photoId },
    data: { is_deleted: true }
  });

  const currentUser = (req as any).crmsUser;
  await prisma.audit_logs.create({
    data: {
      entity_type: 'grievance',
      entity_id: grievanceId,
      action: 'UPDATE',
      changes: {
        foto: {
          old: `Foto: ${existingPhoto.original_name}`,
          new: 'Dihapus dari lampiran'
        }
      },
      actor_user_id: currentUser?.id && currentUser.id > 0n ? currentUser.id : null,
    }
  });

  res.status(204).send();
});

export const reorderGrievancePhotos = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const grievanceId = parseId(req.params.id);
  const { photo_ids } = req.body;
  if (!Array.isArray(photo_ids)) {
    res.status(400).json({ error: 'photo_ids array is required' });
    return;
  }

  await prisma.$transaction(
    photo_ids.map((id: any, index: number) =>
      prisma.grievance_photos.updateMany({
        where: { id: parseId(id), grievance_id: grievanceId },
        data: { sort_order: index }
      })
    )
  );

  res.status(200).json({ message: 'Order updated' });
});
