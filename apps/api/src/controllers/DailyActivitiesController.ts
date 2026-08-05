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
    const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_id, category_id, sub_category_id } = req.body;

    if (!activity_date || !activity || !pic_id || !category_id || !sub_category_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pic = await prisma.pics.findUnique({ where: { id: BigInt(pic_id) } });
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
        cost: cost !== undefined && cost !== null ? Number(cost) : null,
        description_result,
        document_link,
        pic_id: BigInt(pic_id),
        category_id: BigInt(category_id),
        sub_category_id: BigInt(sub_category_id)
      }
    });

    res.status(201).json({ data: result });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const getDailyActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const where: any = { is_deleted: false, is_archived: false };
    if (year) {
      const y = year as string;
      where.activity_date = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lte: new Date(`${y}-12-31T23:59:59.999Z`)
      };
    }
    const activities = await prisma.daily_activities.findMany({
      where,
      include: { pic: true, category: true, sub_category: true }
    });
    
    res.status(200).json({ data: activities });
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

export const updateDailyActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_id, category_id, sub_category_id } = req.body;

    if (!activity_date || !activity || !pic_id || !category_id || !sub_category_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pic = await prisma.pics.findUnique({ where: { id: BigInt(pic_id) } });
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
        cost: cost !== undefined && cost !== null ? Number(cost) : null,
        description_result,
        document_link,
        pic_id: BigInt(pic_id),
        category_id: BigInt(category_id),
        sub_category_id: BigInt(sub_category_id)
      }
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

    const dataToInsert = [];
    for (const r of rows) {
      if (!r.category_id || !r.sub_category_id || !r.pic_id) {
        return res.status(400).json({ error: 'Field referensi (category_id, sub_category_id, pic_id) wajib diisi untuk setiap baris' });
      }
      try {
        dataToInsert.push({
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
          pic_id: BigInt(r.pic_id),
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date()
        });
      } catch (err) {
        return res.status(400).json({ error: 'Format ID atau Tanggal pada baris import tidak valid' });
      }
    }

    const result = await prisma.daily_activities.createMany({
      data: dataToInsert
    });

    res.json({ status: 200, data: { count: result.count } });
  } catch (error: any) {
    handleControllerError(res, error);
  }
};
