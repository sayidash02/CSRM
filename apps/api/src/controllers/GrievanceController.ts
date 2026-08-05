import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
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
      remarks, 
      supporting_files 
    } = req.body;

    if (!register_no || !log_date || !complainant_name || !significance) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.grievance.create({
      data: {
        register_no,
        log_date: new Date(log_date),
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
        remarks,
        supporting_files
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Duplicate register_no' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const where: any = { is_deleted: false, is_archived: false };
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
    
    const serialized = grievances.map(a => ({
      ...a,
      id: a.id.toString(),
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
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
      remarks, 
      supporting_files 
    } = req.body;

    if (!register_no || !log_date || !complainant_name || !significance) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.grievance.update({
      where: { id: BigInt(id as string) },
      data: {
        register_no,
        log_date: new Date(log_date),
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
        remarks,
        supporting_files
      }
    });

    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ error: 'Grievance not found' });
      return;
    }
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Duplicate register_no' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.grievance.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      res.status(404).json({ error: 'Grievance not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
