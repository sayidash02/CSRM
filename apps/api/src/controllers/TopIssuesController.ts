import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { normalizeSharepointLinks } from '../lib/linkUtils.ts';

export const createTopIssue = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { period, issue, description, follow_up, next_plan, year, sharepoint_links } = req.body;

  if (!period || !issue) {
    res.status(400).json({ error: 'Missing required fields: period, issue' });
    return;
  }

  let parsedYear: number | null = null;
  if (year !== undefined && year !== null && year !== '') {
    const p = parseInt(String(year), 10);
    if (!isNaN(p) && p >= 1900 && p <= 2100) {
      parsedYear = p;
    }
  }

  if (parsedYear === null && typeof period === 'string') {
    const match = period.match(/\b(19\d\d|20\d\d|2100)\b/);
    if (match && match[1]) {
      parsedYear = parseInt(match[1], 10);
    }
  }

  if (parsedYear === null) {
    parsedYear = new Date().getFullYear();
  }

  const normalizedLinks = normalizeSharepointLinks(sharepoint_links);

  const result = await prisma.top_issues.create({
    data: {
      period,
      year: parsedYear,
      issue,
      description,
      follow_up,
      next_plan,
      sharepoint_links: normalizedLinks ? (normalizedLinks as any) : undefined
    }
  });

  res.status(201).json({ data: result });
});

export const getTopIssues = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const parsedYear = parseInt(year as string);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      res.status(400).json({ error: 'Parameter year tidak valid' });
      return;
    }
    where.year = parsedYear;
  }
  const issues = await prisma.top_issues.findMany({
    where
  });
  
  res.status(200).json({ data: issues });
});

export const deleteTopIssue = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.top_issues.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const updateTopIssue = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { period, issue, description, follow_up, next_plan, year, sharepoint_links } = req.body;

  if (!period || !issue) {
    res.status(400).json({ error: 'Missing required fields: period, issue' });
    return;
  }

  const updateData: any = {
    period,
    issue,
    description,
    follow_up,
    next_plan
  };

  if (sharepoint_links !== undefined) {
    updateData.sharepoint_links = normalizeSharepointLinks(sharepoint_links);
  }

  let parsedYear: number | null = null;
  if (year !== undefined && year !== null && year !== '') {
    const p = parseInt(String(year), 10);
    if (!isNaN(p) && p >= 1900 && p <= 2100) {
      parsedYear = p;
    }
  } else if (typeof period === 'string') {
    const match = period.match(/\b(19\d\d|20\d\d|2100)\b/);
    if (match && match[1]) {
      parsedYear = parseInt(match[1], 10);
    }
  }

  if (parsedYear !== null) {
    updateData.year = parsedYear;
  }

  const result = await prisma.top_issues.update({
    where: { id: BigInt(id as string) },
    data: updateData
  });

  res.status(200).json({ data: result });
});

export const restoreTopIssue = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.top_issues.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});
