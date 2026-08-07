import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period, issue, description, follow_up, main_document, supporting_document, next_plan, year } = req.body;

    if (!period || !issue) {
      res.status(400).json({ error: 'Missing required fields: period, issue' });
      return;
    }

    const parsedYear = parseInt(year);
    if (!year || isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      res.status(400).json({ error: 'Field year wajib diisi dan harus berupa tahun valid (1900–2100)' });
      return;
    }

    const result = await prisma.top_issues.create({
      data: {
        period,
        year: parsedYear,
        issue,
        description,
        follow_up,
        main_document,
        supporting_document,
        next_plan
      }
    });

    res.status(201).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopIssues = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.top_issues.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Top issue record not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { period, issue, description, follow_up, main_document, supporting_document, next_plan, year } = req.body;

    if (!period || !issue) {
      res.status(400).json({ error: 'Missing required fields: period, issue' });
      return;
    }

    const updateData: any = {
      period,
      issue,
      description,
      follow_up,
      main_document,
      supporting_document,
      next_plan
    };

    if (year !== undefined) {
      const parsedYear = parseInt(year);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        res.status(400).json({ error: 'Field year harus berupa tahun valid (1900–2100)' });
        return;
      }
      updateData.year = parsedYear;
    }

    const result = await prisma.top_issues.update({
      where: { id: BigInt(id as string) },
      data: updateData
    });

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Top issue record not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restoreTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.top_issues.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Top issue record not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
