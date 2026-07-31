import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period, issue, description, follow_up, main_document, supporting_document, next_plan } = req.body;

    if (!period || !issue) {
      res.status(400).json({ error: 'Missing required fields: period, issue' });
      return;
    }

    const result = await prisma.top_issues.create({
      data: {
        period,
        issue,
        description,
        follow_up,
        main_document,
        supporting_document,
        next_plan
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const issues = await prisma.top_issues.findMany({
      where: { is_deleted: false }
    });
    
    const serialized = issues.map(a => ({
      ...a,
      id: a.id.toString(),
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
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
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { period, issue, description, follow_up, main_document, supporting_document, next_plan } = req.body;

    if (!period || !issue) {
      res.status(400).json({ error: 'Missing required fields: period, issue' });
      return;
    }

    const result = await prisma.top_issues.update({
      where: { id: BigInt(id as string) },
      data: {
        period,
        issue,
        description,
        follow_up,
        main_document,
        supporting_document,
        next_plan
      }
    });

    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
