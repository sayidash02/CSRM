import { PrismaClient } from '@prisma/client';
import { generateDiff } from '../utils/diffHelper.ts';

const basePrisma = new PrismaClient();

/**
 * Updates that are visible to users must not succeed without their audit row.
 * The mutation and audit insert intentionally share one database transaction;
 * an audit failure therefore rolls the business mutation back as well.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async update({ model, operation, args, query }) {
        if (model === 'audit_logs' || model === 'export_logs' || model === 'users') return query(args);

        return basePrisma.$transaction(async (tx) => {
          const txModel = (tx as any)[model];
          const oldData = await txModel.findUnique({ where: args.where });
          const result = await txModel.update(args);

          if (!oldData || !result) return result;

          const action = (args.data as any).is_deleted === true ? 'DELETE' : 'UPDATE';
          const diff = action === 'UPDATE' ? generateDiff(oldData, result) : null;
          if (action === 'DELETE' || diff !== null) {
            await tx.audit_logs.create({
              data: {
                entity_type: model,
                entity_id: (result as any).id || BigInt(0),
                action,
                changes: diff ? (diff as any) : null,
              },
            });
          }

          return result;
        });
      },
    },
  },
});

export default prisma as unknown as PrismaClient;
