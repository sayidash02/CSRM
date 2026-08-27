import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';
import { normalizeSharepointLinks } from '../lib/linkUtils.ts';

export const createCsrProject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { 
    project_year, 
    program, 
    activity, 
    type_of_activity, 
    location, 
    target_beneficiaries, 
    objective, 
    status, 
    budget, 
    implementation_period,
    sharepoint_links
  } = req.body;

  if (!project_year || isNaN(Number(project_year)) || !program) {
    res.status(400).json({ error: 'Missing or invalid required fields' });
    return;
  }

  const normalizedLinks = normalizeSharepointLinks(sharepoint_links);

  const result = await prisma.csr_projects.create({
    data: {
      project_year: Number(project_year),
      program,
      activity,
      type_of_activity,
      location,
      target_beneficiaries,
      objective,
      status: status || 'Planning',
      budget,
      implementation_period,
      sharepoint_links: normalizedLinks ? (normalizedLinks as any) : undefined
    }
  });

  res.status(201).json({ data: result });
});

export const getCsrProjects = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted } = req.query;
  const isDeletedFilter = is_deleted === 'true';
  const where: any = { is_deleted: isDeletedFilter, is_archived: false };
  if (year) {
    const y = year as string;
    where.project_year = Number(y);
  }
  const projects = await prisma.csr_projects.findMany({
    where
  });
  
  res.status(200).json({ data: projects });
});

export const updateCsrProject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    project_year, 
    program, 
    activity, 
    type_of_activity, 
    location, 
    target_beneficiaries, 
    objective, 
    status, 
    budget, 
    implementation_period,
    sharepoint_links
  } = req.body;

  if (!project_year || !program) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const updateData: any = {
    project_year: Number(project_year),
    program,
    activity,
    type_of_activity,
    location,
    target_beneficiaries,
    objective,
    status,
    budget,
    implementation_period
  };

  if (sharepoint_links !== undefined) {
    updateData.sharepoint_links = normalizeSharepointLinks(sharepoint_links);
  }

  const result = await prisma.csr_projects.update({
    where: { id: BigInt(id as string) },
    data: updateData
  });

  res.status(200).json({ data: result });
});

export const deleteCsrProject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.csr_projects.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: true }
  });
  res.status(200).json({ data: result });
});

export const restoreCsrProject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await prisma.csr_projects.update({
    where: { id: BigInt(id as string) },
    data: { is_deleted: false }
  });
  res.status(200).json({ data: result });
});


