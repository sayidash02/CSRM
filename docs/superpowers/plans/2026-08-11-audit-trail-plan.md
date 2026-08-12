# CRMS Audit Trail & History Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan sistem audit trail terpusat untuk melacak kapan data diubah dan mencatat histori perubahannya (diff) bagi pengguna tunggal CRMS.

**Architecture:** 
1. `audit_logs` disematkan via Prisma,
2. Endpoint API membaca riwayat per entitas,
3. Logika komparasi (diff) di backend membedakan old vs new values, 
4. UI tabel & drawer universal merender riwayat perubahan.

**Tech Stack:** Prisma, Express.js, React, TailwindCSS.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Tambahkan model `audit_logs` di schema.prisma**
Tambahkan kode ini di baris paling bawah:

```prisma
model audit_logs {
  id          BigInt   @id @default(autoincrement())
  entity_type String   @db.VarChar(50) 
  entity_id   BigInt
  action      String   @db.VarChar(20)
  changes     Json?
  created_at  DateTime @default(now())

  @@index([entity_type, entity_id])
  @@index([created_at])
}
```

- [ ] **Step 2: Jalankan sinkronisasi DB (Prisma Push) untuk Local & Test**

```bash
cd apps/api
npx prisma db push
dotenv -e .env.test -- npx prisma db push
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(db): add audit_logs table to schema"
```

---

### Task 2: Diff Helper Utility

**Files:**
- Create: `apps/api/src/utils/diffHelper.ts`
- Create: `apps/api/tests/utils/diffHelper.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/tests/utils/diffHelper.test.ts
import { generateDiff } from '../../src/utils/diffHelper';

describe('diffHelper', () => {
  it('should return null if no changes', () => {
    const oldData = { cost: 100, status: 'Open' };
    const newData = { cost: 100, status: 'Open' };
    expect(generateDiff(oldData, newData)).toBeNull();
  });

  it('should detect changes and ignore technical fields', () => {
    const oldData = { id: 1n, cost: 100, status: 'Open', updated_at: new Date('2026-01-01') };
    const newData = { id: 1n, cost: 200, status: 'Open', updated_at: new Date('2026-01-02') };
    const diff = generateDiff(oldData, newData);
    expect(diff).toEqual({ cost: { old: 100, new: 200 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- --testPathPattern=diffHelper` di dalam `apps/api`

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/utils/diffHelper.ts
export const generateDiff = (oldData: any, newData: any): any => {
  const diff: Record<string, { old: any; new: any }> = {};
  const ignoredFields = ['id', 'created_at', 'updated_at', 'is_deleted'];

  if (!oldData || !newData) return null;

  for (const key of Object.keys(newData)) {
    if (ignoredFields.includes(key)) continue;
    
    // Stringify comparison to handle Date and BigInt natively
    const oldVal = oldData[key] !== undefined && oldData[key] !== null ? oldData[key].toString() : null;
    const newVal = newData[key] !== undefined && newData[key] !== null ? newData[key].toString() : null;

    if (oldVal !== newVal) {
      diff[key] = { old: oldData[key], new: newData[key] };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
};
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- --testPathPattern=diffHelper` di dalam `apps/api`

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/utils/diffHelper.ts apps/api/tests/utils/diffHelper.test.ts
git commit -m "feat(api): add diffHelper utility for audit logs"
```

---

### Task 3: AuditLogService & Middleware Extension

Karena mengedit 8 Controller secara manual berisiko tinggi dan melanggar prinsip DRY, kita akan membungkus inisialisasi Prisma Client di `prisma.ts` dengan Prisma Client Extension `$extends`. Ini 100% menangkap setiap operasi `update` tanpa menyentuh satupun file controller yang sudah ada, sesuai requirement (otomatis menarik data lama, membandingkan, dan mencatat log).

**Files:**
- Modify: `apps/api/src/lib/prisma.ts`

- [ ] **Step 1: Tulis integrasi Prisma Extension di `prisma.ts`**

```typescript
// Timpa isi apps/api/src/lib/prisma.ts dengan ini:
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
          const action = args.data.is_deleted === true ? 'DELETE' : 'UPDATE';
          const diff = action === 'UPDATE' ? generateDiff(oldData, result) : null;

          if (action === 'DELETE' || diff !== null) {
            // Gunakan fire-and-forget atau await ringan
            basePrisma.audit_logs.create({
              data: {
                entity_type: model,
                entity_id: result.id,
                action,
                changes: diff ? (diff as any) : null,
              }
            }).catch(err => console.error('Failed to write audit log:', err));
          }
        }

        return result;
      },
    },
  },
});

export default prisma;
```

- [ ] **Step 2: Jalankan Typescript Check**
Run: `npx tsc --noEmit` di dalam `apps/api` untuk memastikan tidak ada error tipe.

- [ ] **Step 3: Jalankan Integration Tests Eksisting (Regression)**
Run: `npm run test` di `apps/api`. Harusnya sukses semua. (Prisma Extension API transparan terhadap controller).

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/lib/prisma.ts
git commit -m "feat(api): implement global audit log interceptor via Prisma extension"
```

---

### Task 4: AuditLog API (Controller & Route)

**Files:**
- Create: `apps/api/src/controllers/AuditLogController.ts`
- Create: `apps/api/src/routes/auditLog.routes.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write Controller & Route**

```typescript
// apps/api/src/controllers/AuditLogController.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    
    const logs = await prisma.audit_logs.findMany({
      where: {
        entity_type: entityType,
        entity_id: BigInt(entityId)
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ data: logs });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error fetching logs' });
  }
};
```

```typescript
// apps/api/src/routes/auditLog.routes.ts
import { Router } from 'express';
import { getAuditLogs } from '../controllers/AuditLogController';

const router = Router();
router.get('/:entityType/:entityId', getAuditLogs);
export default router;
```

- [ ] **Step 2: Daftarkan Route di `app.ts`**
Di dalam `apps/api/src/app.ts`:
Tambahkan `import auditLogRoutes from './routes/auditLog.routes';`
Lalu daftarkan di blok routes: `app.use('/api/audit-logs', auditLogRoutes);`

- [ ] **Step 3: Tulis Integration Test Cepat & Jalankan**
Bisa gunakan file test atau manual via curl jika kesulitan. 

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/controllers/AuditLogController.ts apps/api/src/routes/auditLog.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add endpoint for fetching audit logs"
```

---

### Task 5: Frontend API Client & Field Dictionary

**Files:**
- Modify: `apps/web/src/services/api.ts` (jika ada, atau buat baru)
- Create: `apps/web/src/utils/fieldDictionary.ts`

- [ ] **Step 1: Kamus Data Field (Field Dictionary)**

```typescript
// apps/web/src/utils/fieldDictionary.ts
export const FIELD_DICTIONARY: Record<string, string> = {
  cost: 'Biaya',
  description_result: 'Keterangan & Hasil',
  status: 'Status',
  activity: 'Aktivitas',
  activity_date: 'Tanggal Aktivitas',
  location: 'Lokasi',
  budget: 'Anggaran',
  issue: 'Isu',
  // tambahkan field lain jika perlu
};

export const translateField = (key: string): string => {
  return FIELD_DICTIONARY[key] || key;
};
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/utils/fieldDictionary.ts
git commit -m "feat(web): add dictionary mapping for audit trail frontend"
```

---

### Task 6: AuditHistoryDrawer Component

**Files:**
- Create: `apps/web/src/components/ui/AuditHistoryDrawer.tsx`

- [ ] **Step 1: Write the Drawer Component**
Menggunakan komponen dasar Tailwind / HeadlessUI atau murni state.

```tsx
// apps/web/src/components/ui/AuditHistoryDrawer.tsx
import React, { useEffect, useState } from 'react';
import { translateField } from '../../utils/fieldDictionary';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string | null;
}

export const AuditHistoryDrawer: React.FC<DrawerProps> = ({ isOpen, onClose, entityType, entityId }) => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && entityId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/audit-logs/${entityType}/${entityId}`)
        .then(r => r.json())
        .then(res => setLogs(res.data || []))
        .catch(e => console.error(e));
    }
  }, [isOpen, entityType, entityId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="w-96 h-full bg-white shadow-xl relative z-10 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Riwayat Perubahan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">Tutup</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {logs.length === 0 ? <p className="text-sm text-gray-500">Belum ada riwayat.</p> : null}
          {logs.map((log: any) => (
            <div key={log.id} className="border p-3 rounded shadow-sm text-sm">
              <div className="font-semibold">{log.action === 'UPDATE' ? 'Diedit' : log.action === 'DELETE' ? 'Dihapus' : 'Dibuat'}</div>
              <div className="text-xs text-gray-400 mb-2">{new Date(log.created_at).toLocaleString('id-ID')}</div>
              {log.changes && Object.entries(log.changes).map(([field, vals]: any) => (
                <div key={field} className="mt-1 bg-gray-50 p-1 rounded">
                  <span className="font-medium text-gray-700">{translateField(field)}</span>: 
                  <span className="text-red-500 line-through mx-1">{String(vals.old)}</span> ➔ 
                  <span className="text-green-600 mx-1">{String(vals.new)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Component**
```bash
git add apps/web/src/components/ui/AuditHistoryDrawer.tsx
git commit -m "feat(web): build universal AuditHistoryDrawer component"
```

---

### Task 7: Integrate UI ke Datagrid (Contoh: Daily Activities)

*Catatan: Langkah ini dapat diulang/disalin polanya untuk modul lain.*

**Files:**
- Modify: `apps/web/src/app/(dashboard)/daily-activities/page.tsx` (atau file tabel terkait yang me-render datagrid)

- [ ] **Step 1: Pasang Drawer & Tombol Action**
Buka file page/tabel utama `DailyActivities`, impor `AuditHistoryDrawer`, tambahkan state `isDrawerOpen`, `selectedId`.
Di kolom konfigurasi tabel:
1. Tambahkan kolom "Terakhir Diubah", nilainya dari `updated_at`.
2. Pada Action Column, tambahkan tombol `History` (Ikon Jam) yang men-set `setSelectedId(row.id)` dan `setIsDrawerOpen(true)`.
3. Letakkan `<AuditHistoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} entityType="daily_activities" entityId={selectedId} />` di root render component.

- [ ] **Step 2: Jalankan Frontend & Uji Manual**
Run: `npm run dev` di `apps/web`. Buka halaman, coba edit suatu baris, lalu klik ikon History. Pastikan Drawer terbuka dan menampilkan `cost` lama vs baru.

- [ ] **Step 3: Commit UI Integration**
```bash
git add apps/web/src/app/
git commit -m "feat(web): integrate audit trail history drawer into Daily Activities"
```
