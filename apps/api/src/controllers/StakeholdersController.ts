import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const createStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { stakeholder, stakeholder_id, date, venue, concern_issue, document_link } = req.body;

  let sId: bigint | null = stakeholder_id ? BigInt(stakeholder_id) : null;
  let sName: string | null = null;

  if (!sId && typeof stakeholder === 'string') {
    const trimmed = stakeholder.trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Missing required field: stakeholder' });
      return;
    }
    let st = await prisma.stakeholders.findFirst({ where: { name: trimmed, is_deleted: false } });
    if (!st) {
      st = await prisma.stakeholders.create({ data: { name: trimmed } });
    }
    sId = st.id;
    sName = st.name;
  } else if (!sId) {
    res.status(400).json({ error: 'Missing required field: stakeholder' });
    return;
  }

  if (!sName && sId) {
    const st = await prisma.stakeholders.findUnique({ where: { id: sId } });
    sName = st ? st.name : null;
  }

  const result = await prisma.stakeholder_engagement.create({
    data: {
      stakeholder_id: sId,
      date: date ? new Date(date) : null,
      venue,
      concern_issue,
      document_link
    }
  });

  res.status(201).json({
    data: {
      ...result,
      stakeholder: sName
    }
  });
});

export const getStakeholders = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const y = year as string;
    where.date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
  const stakeholders = await prisma.stakeholder_engagement.findMany({
    where,
    include: { stakeholder: true }
  });

  const formatted = stakeholders.map((item) => ({
    ...item,
    stakeholder: item.stakeholder?.name || null
  }));
  
  res.status(200).json({ data: formatted });
});

export const deleteStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const updateStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { stakeholder, stakeholder_id, date, venue, concern_issue, document_link } = req.body;

  let sId: bigint | null = stakeholder_id ? BigInt(stakeholder_id) : null;
  let sName: string | null = null;

  if (!sId && typeof stakeholder === 'string') {
    const trimmed = stakeholder.trim();
    if (trimmed) {
      let st = await prisma.stakeholders.findFirst({ where: { name: trimmed, is_deleted: false } });
      if (!st) {
        st = await prisma.stakeholders.create({ data: { name: trimmed } });
      }
      sId = st.id;
      sName = st.name;
    }
  }

  if (!sName && sId) {
    const st = await prisma.stakeholders.findUnique({ where: { id: sId } });
    sName = st ? st.name : null;
  }

  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: {
      stakeholder_id: sId,
      date: date ? new Date(date) : null,
      venue,
      concern_issue,
      document_link
    }
  });

  res.status(200).json({
    data: {
      ...result,
      stakeholder: sName
    }
  });
});

export const restoreStakeholder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.stakeholder_engagement.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});

