import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;

    if (!entityType || !entityId || isNaN(Number(entityId))) {
      res.status(400).json({ error: 'Missing or invalid entityType or entityId' });
      return;
    }
    
    const logs = await prisma.audit_logs.findMany({
      where: {
        entity_type: entityType as string,
        entity_id: BigInt(entityId as string)
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            role: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error fetching logs' });
  }
};
