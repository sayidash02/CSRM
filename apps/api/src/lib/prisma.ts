import { PrismaClient } from '@prisma/client';
import { generateDiff } from '../utils/diffHelper.ts';
import { getCurrentUser } from './asyncContext.ts';

const basePrisma = new PrismaClient();

const AUDITED_CREATE_MODELS = new Set([
  'daily_activities',
  'stakeholders',
  'csr_projects',
  'proposals',
  'grievance',
  'top_issues',
  'lrp'
]);

/**
 * Updates that are visible to users must not succeed without their audit row.
 * The mutation and audit insert intentionally share one database transaction;
 * an audit failure therefore rolls the business mutation back as well.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, operation, args, query }) {
        if (!AUDITED_CREATE_MODELS.has(model)) return query(args);

        return basePrisma.$transaction(async (tx) => {
          const txModel = (tx as any)[model];
          const result = await txModel.create(args);

          if (!result) return result;

          const currentUser = getCurrentUser();
          const actorUserId = currentUser?.id && currentUser.id > 0n ? currentUser.id : null;

          await tx.audit_logs.create({
            data: {
              entity_type: model,
              entity_id: (result as any).id || BigInt(0),
              action: 'CREATE',
              actor_user_id: actorUserId,
            },
          });

          return result;
        });
      },

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
            const currentUser = getCurrentUser();
            const actorUserId = currentUser?.id && currentUser.id > 0n ? currentUser.id : null;

            await tx.audit_logs.create({
              data: {
                entity_type: model,
                entity_id: (result as any).id || BigInt(0),
                action,
                changes: diff ? (diff as any) : undefined,
                actor_user_id: actorUserId,
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
