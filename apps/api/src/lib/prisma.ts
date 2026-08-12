import { PrismaClient } from '@prisma/client';
import { generateDiff } from '../utils/diffHelper';

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async update({ model, operation, args, query }) {
        if (model === 'audit_logs' || model === 'sync_log') {
          return query(args); // Skip technical tables
        }

        // 1. Ambil data lama
        const oldData = await (basePrisma as any)[model].findUnique({
          where: args.where,
        });

        // 2. Eksekusi query update utama
        const result = await query(args);

        // 3. Catat audit log secara asinkron (terisolasi)
        if (oldData && result) {
          const action = (args.data as any).is_deleted === true ? 'DELETE' : 'UPDATE';
          const diff = action === 'UPDATE' ? generateDiff(oldData, result) : null;

          if (action === 'DELETE' || diff !== null) {
            // Gunakan fire-and-forget atau await ringan
            (basePrisma as any).audit_logs.create({
              data: {
                entity_type: model,
                entity_id: result.id,
                action,
                changes: diff ? (diff as any) : null,
              }
            }).catch((err: any) => console.error('Failed to write audit log:', err));
          }
        }

        return result;
      },
    },
  },
});

export default prisma as unknown as PrismaClient;
