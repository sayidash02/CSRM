import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createCsrProject = async (req: Request, res: Response): Promise<void> => {
  try {
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
      documentation_image, 
      document 
    } = req.body;

    if (!project_year || isNaN(Number(project_year)) || !program) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

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
        documentation_image,
        document
      }
    });

    res.status(201).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCsrProjects = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCsrProject = async (req: Request, res: Response): Promise<void> => {
  try {
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
      documentation_image, 
      document 
    } = req.body;

    if (!project_year || !program) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.csr_projects.update({
      where: { id: BigInt(id as string) },
      data: {
        project_year: Number(project_year),
        program,
        activity,
        type_of_activity,
        location,
        target_beneficiaries,
        objective,
        status,
        budget,
        implementation_period,
        documentation_image,
        document
      }
    });

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'CSR project not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCsrProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.csr_projects.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'CSR project not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restoreCsrProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.csr_projects.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'CSR project not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

