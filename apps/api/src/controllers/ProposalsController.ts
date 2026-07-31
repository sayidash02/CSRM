import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      registration_no,
      date_received,
      institution,
      address,
      proposal_description,
      proposal_file,
      assessment_file,
      status
    } = req.body;

    if (!registration_no || !date_received || !institution) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.proposals.create({
      data: {
        registration_no,
        date_received: new Date(date_received),
        institution,
        address,
        proposal_description,
        proposal_file,
        assessment_file,
        status: status || 'Under Review'
      }
    });

    res.status(201).json({ data: { ...result, id: result.id.toString() } });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
       res.status(409).json({ error: 'Registration number already exists' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProposals = async (req: Request, res: Response): Promise<void> => {
  try {
    const proposals = await prisma.proposals.findMany({
      where: { is_deleted: false }
    });
    
    const serialized = proposals.map(p => ({
      ...p,
      id: p.id.toString()
    }));
    res.status(200).json({ data: serialized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      registration_no,
      date_received,
      institution,
      address,
      proposal_description,
      proposal_file,
      assessment_file,
      status
    } = req.body;

    if (!registration_no || !date_received || !institution) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await prisma.proposals.update({
      where: { id: BigInt(id as string) },
      data: {
        registration_no,
        date_received: new Date(date_received),
        institution,
        address,
        proposal_description,
        proposal_file,
        assessment_file,
        status
      }
    });

    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Proposal not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.proposals.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: true }
    });
    res.status(200).json({ data: { ...result, id: result.id.toString() } });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Proposal not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
