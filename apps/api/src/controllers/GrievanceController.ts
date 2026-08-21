import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { generateRegistrationNumber } from '../services/RegistrationNumberService';

const SIGNIFICANCE_VALUES = new Set(['Low', 'Medium', 'High', 'Critical']);
const GRIEVANCE_STATUSES = new Set(['Open', 'On Progress', 'Resolved', 'Closed']);

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const createGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { 
    register_no: _registerNo,
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

  const registerNo = await generateRegistrationNumber('grievance', logDate);
  const result = await prisma.grievance.create({
    data: {
      register_no: registerNo,
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
    where
  });
  
  res.status(200).json({ data: grievances });
});

export const updateGrievance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    register_no: _registerNo,
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

  const result = await prisma.grievance.update({
    where: { id: BigInt(id as string) },
    data: {
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
