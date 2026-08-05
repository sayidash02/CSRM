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

    if (!project_year || !program) {
      res.status(400).json({ error: 'Missing required fields' });
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

    res.status(201).json({ data: { ...result, id: result.id.toString(), budget: result.budget?.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCsrProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const where: any = { is_deleted: false, is_archived: false };
    if (year) {
      const y = year as string;
      where.project_year = Number(y);
    }
    const projects = await prisma.csr_projects.findMany({
      where
    });
    
    const serialized = projects.map(a => ({
      ...a,
      id: a.id.toString(),
      budget: a.budget?.toString()
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
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

    res.status(200).json({ data: { ...result, id: result.id.toString(), budget: result.budget?.toString() } });
  } catch (error) {
    console.error(error);
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
    res.status(200).json({ data: { ...result, id: result.id.toString(), budget: result.budget?.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
