# Fix Export Payload Too Large Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan pesan error "Gagal mengekspor data" dengan menaikkan limit ukuran payload JSON di Express backend menjadi 50mb.

**Architecture:** Konfigurasi body-parser middleware di `apps/api/src/app.ts` diubah dengan passing option `{ limit: '50mb' }`.

**Tech Stack:** Express, Node.js, TypeScript

---

### Task 1: Update Express JSON Limits

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Update konfigurasi express.json dan urlencoded di `app.ts`**

Ubah bagian inisialisasi Express JSON di `apps/api/src/app.ts` sekitar baris 29.

Dari:
```typescript
const app = express();
app.use(cors());
app.use(express.json());
```

Menjadi:
```typescript
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

- [ ] **Step 2: Jalankan typecheck di apps/api**

Run: `cd apps/api && npx tsc --noEmit`
Expected: Tidak ada error output (exit code 0).

- [ ] **Step 3: Commit perubahan**

```bash
git add apps/api/src/app.ts
git commit -m "fix(api): increase express json payload limit to 50mb to allow large data exports"
```
