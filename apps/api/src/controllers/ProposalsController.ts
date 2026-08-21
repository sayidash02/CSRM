import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { generateRegistrationNumber } from '../services/RegistrationNumberService';

const PROPOSAL_STATUSES = new Set(['Accept', 'Decline']);

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const createProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    registration_no: _registrationNo,
    date_received,
    institution,
    address,
    proposal_description,
    status
  } = req.body;

  const receivedDate = parseRequiredDate(date_received);
  if (!receivedDate || typeof institution !== 'string' || !institution.trim() || !PROPOSAL_STATUSES.has(status)) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const registrationNo = await generateRegistrationNumber('proposal', receivedDate);

  const result = await prisma.proposals.create({
    data: {
      registration_no: registrationNo,
      date_received: receivedDate,
      institution,
      address,
      proposal_description,
      status
    }
  });

  res.status(201).json({ data: result });
});

export const getProposals = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const y = year as string;
    where.date_received = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
  const proposals = await prisma.proposals.findMany({
    where
  });

  res.status(200).json({ data: proposals });
});

export const updateProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    registration_no: _registrationNo,
    date_received,
    institution,
    address,
    proposal_description,
    status
  } = req.body;

  const receivedDate = parseRequiredDate(date_received);
  if (!receivedDate || typeof institution !== 'string' || !institution.trim() || !PROPOSAL_STATUSES.has(status)) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const result = await prisma.proposals.update({
    where: { id: BigInt(id as string) },
    data: {
      date_received: receivedDate,
      institution,
      address,
      proposal_description,
      status
    }
  });

  res.status(200).json({ data: result });
});

export const deleteProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.proposals.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const restoreProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.proposals.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});
