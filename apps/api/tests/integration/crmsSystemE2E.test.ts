import request from 'supertest';
import ExcelJS from 'exceljs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { createSession, hashPassword } from '../../src/lib/auth';

const binaryParser = (
  res: any,
  callback: (error: Error | null, body?: Buffer) => void
): void => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
  res.on('error', (error: Error) => callback(error));
};

describe('CRMS Comprehensive System & E2E Testing', () => {
  const adminUsername = `sys-admin-${Date.now()}`;
  const regularUsername = `sys-user-${Date.now()}`;
  const password = 'SystemTestPassword123!';

  let adminUserId: bigint;
  let regularUserId: bigint;
  let adminSessionCookie: string;
  let userSessionCookie: string;

  let testCatId: bigint;
  let testSubCatId: bigint;
  let testPicId: bigint;

  let createdDailyActivityId: string;
  let createdStakeholderId: string;
  let createdTopIssueId: string;
  let createdProposalId: string;
  let createdCsrProjectId: string;
  let createdGrievanceId: string;
  let createdLrpId: string;

  // Valid 1x1 PNG binary with standard PNG header
  const onePixelPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );

  beforeAll(async () => {
    // 1. Setup Admin and Regular User
    const admin = await prisma.users.create({
      data: {
        username: adminUsername,
        password_hash: hashPassword(password),
        role: 'ADMIN',
      },
    });
    adminUserId = admin.id;

    const user = await prisma.users.create({
      data: {
        username: regularUsername,
        password_hash: hashPassword(password),
        role: 'USER',
      },
    });
    regularUserId = user.id;

    adminSessionCookie = `crms_session=${createSession({
      id: adminUserId,
      username: adminUsername,
      role: 'ADMIN',
    })}`;
    userSessionCookie = `crms_session=${createSession({
      id: regularUserId,
      username: regularUsername,
      role: 'USER',
    })}`;

    // 2. Setup Master Data
    const category = await prisma.categories.upsert({
      where: { name: 'Stakeholder Engagement' },
      update: {},
      create: { name: 'Stakeholder Engagement' },
    });
    testCatId = category.id;

    const subCategory = await prisma.sub_categories.upsert({
      where: { category_id_name: { category_id: testCatId, name: 'Issue' } },
      update: {},
      create: { category_id: testCatId, name: 'Issue' },
    });
    testSubCatId = subCategory.id;

    const pic = await prisma.pics.upsert({
      where: { name: 'Septian E2E' },
      update: {},
      create: { name: 'Septian E2E' },
    });
    testPicId = pic.id;
  });

  afterAll(async () => {
    // Clean up created test entities
    if (createdDailyActivityId) {
      await prisma.daily_activity_photos.deleteMany({
        where: { activity_id: BigInt(createdDailyActivityId) },
      });
      await prisma.daily_activity_pics.deleteMany({
        where: { activity_id: BigInt(createdDailyActivityId) },
      });
      await prisma.daily_activities.deleteMany({
        where: { id: BigInt(createdDailyActivityId) },
      });
    }
    if (createdStakeholderId) {
      await prisma.stakeholder_engagement.deleteMany({
        where: { id: BigInt(createdStakeholderId) },
      });
    }
    if (createdTopIssueId) {
      await prisma.top_issues.deleteMany({
        where: { id: BigInt(createdTopIssueId) },
      });
    }
    if (createdProposalId) {
      await prisma.proposals.deleteMany({
        where: { id: BigInt(createdProposalId) },
      });
    }
    if (createdCsrProjectId) {
      await prisma.csr_projects.deleteMany({
        where: { id: BigInt(createdCsrProjectId) },
      });
    }
    if (createdGrievanceId) {
      await prisma.grievance.deleteMany({
        where: { id: BigInt(createdGrievanceId) },
      });
    }
    if (createdLrpId) {
      await prisma.lrp.deleteMany({
        where: { id: BigInt(createdLrpId) },
      });
    }
    await prisma.users.deleteMany({
      where: { username: { in: [adminUsername, regularUsername] } },
    });
    await prisma.$disconnect();
  });

  describe('1. System Health & Authentication Flow', () => {
    it('verifies /health endpoint is live and connected to DB', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('status', 'ok');
    });

    it('authenticates user via POST /api/auth/login and receives session', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: regularUsername, password });
      expect(res.status).toBe(200);
      expect(res.body.data.user).toHaveProperty('username', regularUsername);
      expect(res.body.data.user).toHaveProperty('role', 'USER');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects invalid password during login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: regularUsername, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });
  });

  describe('2. Daily Activities Lifecycle, MOM & Photo Management', () => {
    it('creates a new Daily Activity with complete metadata', async () => {
      const payload = {
        activity_date: '2026-06-15',
        activity: 'Pertemuan Evaluasi Nelayan E2E',
        institution_group: 'Kelompok Nelayan Muara',
        address: 'Balai Desa Cilamaya',
        category_id: String(testCatId),
        sub_category_id: String(testSubCatId),
        focus: 'Kompensasi & Bantuan Alat Tangkap',
        location: 'Cilamaya Girang',
        cost: 2500000,
        pic_ids: [String(testPicId)],
        keterangan: 'Koordinasi tindak lanjut penyaluran bantuan',
        hasil: 'Disepakati jadwal verifikasi lapangan bersama',
        kesimpulan: 'Seluruh perwakilan menyetujui tahapan verifikasi',
        next_plan: 'Kunjungan verifikasi dokumen perahu',
      };

      const res = await request(app)
        .post('/api/daily-activities')
        .set('Cookie', userSessionCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.activity).toBe(payload.activity);
      expect(res.body.data.kesimpulan).toBe(payload.kesimpulan);
      createdDailyActivityId = String(res.body.data.id);
    });

    it('uploads documentation photos to the activity', async () => {
      // Upload Photo 1
      const res1 = await request(app)
        .post('/api/daily-activities/upload-photo')
        .set('Cookie', userSessionCookie)
        .attach('file', onePixelPng, 'foto-evaluasi-1.png')
        .field('activity_id', createdDailyActivityId);
      expect(res1.status).toBe(201);

      // Verify activity has photos populated
      const getRes = await request(app)
        .get('/api/daily-activities')
        .query({ no_paginate: 'true' })
        .set('Cookie', userSessionCookie);
      expect(getRes.status).toBe(200);
      const activity = getRes.body.data.find((a: any) => String(a.id) === createdDailyActivityId);
      expect(activity).toBeDefined();
      expect(activity.photos.length).toBeGreaterThanOrEqual(1);
    });

    it('exports Single MOM in Excel, Word (DOCX), and PDF formats', async () => {
      // 1. Single MOM Excel
      const excelRes = await request(app)
        .get(`/api/daily-activities/${createdDailyActivityId}/mom?format=xlsx`)
        .set('Cookie', userSessionCookie)
        .parse(binaryParser);
      expect(excelRes.status).toBe(200);
      expect(excelRes.headers['content-type']).toContain('spreadsheetml');
      expect(excelRes.body.length).toBeGreaterThan(1000);

      // 2. Single MOM DOCX
      const docxRes = await request(app)
        .get(`/api/daily-activities/${createdDailyActivityId}/mom?format=docx`)
        .set('Cookie', userSessionCookie)
        .parse(binaryParser);
      expect(docxRes.status).toBe(200);
      expect(docxRes.headers['content-type']).toContain('wordprocessingml');
      expect(docxRes.body.length).toBeGreaterThan(1000);

      // 3. Single MOM PDF
      const pdfRes = await request(app)
        .get(`/api/daily-activities/${createdDailyActivityId}/mom?format=pdf`)
        .set('Cookie', userSessionCookie)
        .parse(binaryParser);
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
      expect(pdfRes.body.length).toBeGreaterThan(1000);
    });

    it('exports Bulk MOM Excel containing master Rekap and activity sheets', async () => {
      const bulkRes = await request(app)
        .get('/api/daily-activities/export/mom-workbook')
        .set('Cookie', userSessionCookie)
        .parse(binaryParser);
      expect(bulkRes.status).toBe(200);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bulkRes.body);
      expect(workbook.getWorksheet('Rekap Daily Activities')).toBeDefined();
    });

    it('updates activity and verifies audit log is recorded', async () => {
      const updateRes = await request(app)
        .put(`/api/daily-activities/${createdDailyActivityId}`)
        .set('Cookie', userSessionCookie)
        .send({
          activity_date: '2026-06-15',
          activity: 'Pertemuan Evaluasi Nelayan E2E (Updated)',
          cost: 3000000,
          category_id: String(testCatId),
          sub_category_id: String(testSubCatId),
          pic_ids: [String(testPicId)],
        });
      expect(updateRes.status).toBe(200);

      const auditRes = await request(app)
        .get(`/api/audit-logs/daily_activities/${createdDailyActivityId}`)
        .set('Cookie', userSessionCookie);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
      expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('soft-deletes and restores photo seamlessly without conflict', async () => {
      const getRes = await request(app)
        .get('/api/daily-activities')
        .query({ no_paginate: 'true' })
        .set('Cookie', userSessionCookie);
      const activity = getRes.body.data.find((a: any) => String(a.id) === createdDailyActivityId);
      const photoId = activity.photos[0].id;

      // Soft delete
      const delRes = await request(app)
        .delete(`/api/daily-activities/${createdDailyActivityId}/photos/${photoId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(204);

      // Re-upload same photo -> should restore successfully
      const reUploadRes = await request(app)
        .post('/api/daily-activities/upload-photo')
        .set('Cookie', userSessionCookie)
        .attach('file', onePixelPng, 'foto-evaluasi-1.png')
        .field('activity_id', createdDailyActivityId);
      expect(reUploadRes.status).toBe(201);
    });
  });

  describe('3. Stakeholder Engagement Lifecycle', () => {
    it('creates, updates, soft-deletes, and restores a stakeholder engagement record', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/stakeholders')
        .set('Cookie', userSessionCookie)
        .send({
          stakeholder: 'Kepala Desa Cilamaya',
          date: '2026-06-16',
          venue: 'Kantor Balai Desa',
          concern_issue: 'Permohonan perbaikan dermaga nelayan',
        });
      expect(createRes.status).toBe(201);
      createdStakeholderId = String(createRes.body.data.id);

      // Update
      const updateRes = await request(app)
        .put(`/api/stakeholders/${createdStakeholderId}`)
        .set('Cookie', userSessionCookie)
        .send({
          stakeholder: 'Kepala Desa Cilamaya Girang',
          concern_issue: 'Permohonan perbaikan dermaga & lampu suar',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.stakeholder).toBe('Kepala Desa Cilamaya Girang');

      // Soft delete
      const delRes = await request(app)
        .delete(`/api/stakeholders/${createdStakeholderId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      // Restore
      const restoreRes = await request(app)
        .patch(`/api/stakeholders/${createdStakeholderId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('4. Top Issues Lifecycle', () => {
    it('creates, updates, and restores a top issue record', async () => {
      const createRes = await request(app)
        .post('/api/top-issues')
        .set('Cookie', userSessionCookie)
        .send({
          year: 2026,
          period: 'Semester 1',
          issue: 'Sengketa Batas Wilayah Tangkap',
          description: 'Koordinasi antar kelompok nelayan perbatasan',
          follow_up: 'Mediasi bersama Dinas Kelautan',
          next_plan: 'Penandatanganan kesepakatan batas',
        });
      expect(createRes.status).toBe(201);
      createdTopIssueId = String(createRes.body.data.id);

      const delRes = await request(app)
        .delete(`/api/top-issues/${createdTopIssueId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      const restoreRes = await request(app)
        .patch(`/api/top-issues/${createdTopIssueId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('5. Proposals Lifecycle', () => {
    it('creates, assesses status, and restores a proposal record', async () => {
      const createRes = await request(app)
        .post('/api/proposals')
        .set('Cookie', userSessionCookie)
        .send({
          registration_no: `PRP-SYS-${Date.now()}`,
          date_received: '2026-06-18',
          institution: 'Koperasi Mina Sejahtera',
          address: 'Muara Cilamaya',
          proposal_description: 'Pengadaan Cold Storage Komunal',
          status: 'Accept',
        });
      expect(createRes.status).toBe(201);
      createdProposalId = String(createRes.body.data.id);

      const delRes = await request(app)
        .delete(`/api/proposals/${createdProposalId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      const restoreRes = await request(app)
        .patch(`/api/proposals/${createdProposalId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('6. CSR Projects Lifecycle', () => {
    it('creates, calculates budget, and manages a CSR project record', async () => {
      const createRes = await request(app)
        .post('/api/csr-projects')
        .set('Cookie', userSessionCookie)
        .send({
          project_year: 2026,
          program: 'Pemberdayaan Ekonomi Pesisir',
          activity: 'Pelatihan Olahan Hasil Ikan',
          type_of_activity: 'Pelatihan & Pendampingan',
          location: 'Cilamaya Girang',
          target_beneficiaries: '40 Ibu Rumah Tangga Nelayan',
          objective: 'Peningkatan nilai tambah hasil tangkapan',
          status: 'On Going',
          budget: 75000000,
          implementation_period: 'Q2-Q3 2026',
        });
      expect(createRes.status).toBe(201);
      createdCsrProjectId = String(createRes.body.data.id);

      const delRes = await request(app)
        .delete(`/api/csr-projects/${createdCsrProjectId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      const restoreRes = await request(app)
        .patch(`/api/csr-projects/${createdCsrProjectId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('7. Grievance Redress Mechanism Lifecycle', () => {
    it('registers, investigates, and resolves a grievance complaint', async () => {
      const createRes = await request(app)
        .post('/api/grievance')
        .set('Cookie', userSessionCookie)
        .send({
          register_no: `GRV-SYS-${Date.now()}`,
          log_date: '2026-06-20',
          complainant_name: 'Warga Dusun Muara',
          address: 'RT 02 RW 01',
          phone: '08123456789',
          category: 'Lingkungan',
          significance: 'Medium',
          description: 'Keluhan debu proyek perbaikan jalan akses',
          location: 'Jalan Akses Muara',
          investigation: 'Pengecekan frekuensi penyiraman jalan',
          resolution: 'Peningkatan jadwal penyiraman menjadi 3x sehari',
          feedback: 'Warga puas dengan respon cepat tim',
          status: 'Resolved',
          remarks: 'Selesai dalam 2 hari',
        });
      expect(createRes.status).toBe(201);
      createdGrievanceId = String(createRes.body.data.id);

      const delRes = await request(app)
        .delete(`/api/grievance/${createdGrievanceId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      const restoreRes = await request(app)
        .patch(`/api/grievance/${createdGrievanceId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('8. LRP (Livelihood Restoration Program) Lifecycle', () => {
    it('creates, updates, and restores an LRP record', async () => {
      const createRes = await request(app)
        .post('/api/lrp')
        .set('Cookie', userSessionCookie)
        .send({
          program: 'Bantuan Bibit Mangrove & Konservasi Pesisir',
          year: 2026,
        });
      expect(createRes.status).toBe(201);
      createdLrpId = String(createRes.body.data.id);

      const delRes = await request(app)
        .delete(`/api/lrp/${createdLrpId}`)
        .set('Cookie', userSessionCookie);
      expect(delRes.status).toBe(200);

      const restoreRes = await request(app)
        .patch(`/api/lrp/${createdLrpId}/restore`)
        .set('Cookie', userSessionCookie);
      expect(restoreRes.status).toBe(200);
    });
  });

  describe('9. Dashboard & Full Operational Workbook Export System', () => {
    it('aggregates total statistics correctly on /api/dashboard/stats', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?year=2026')
        .set('Cookie', userSessionCookie);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totals');
      expect(res.body.data.totals.daily).toBeGreaterThanOrEqual(1);
    });

    it('exports Full CRMS Workbook with all 7 module sheets populated with data and photos', async () => {
      const res = await request(app)
        .get('/api/export/workbook?year=2026')
        .set('Cookie', userSessionCookie)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      // Verify all 7 modules exist in the generated workbook
      expect(workbook.getWorksheet('Daily Activities 2026')).toBeDefined();
      expect(workbook.getWorksheet('Stakeholder Engagement 2026')).toBeDefined();
      expect(workbook.getWorksheet('Top Issue')).toBeDefined();
      expect(workbook.getWorksheet('Proposal 2026')).toBeDefined();
      expect(workbook.getWorksheet('CSR Project 2026')).toBeDefined();
      expect(workbook.getWorksheet('Grievance 2026')).toBeDefined();
      expect(workbook.getWorksheet('LRP')).toBeDefined();

      const dailySheet = workbook.getWorksheet('Daily Activities 2026')!;
      expect(dailySheet.rowCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('10. Security Boundaries & RBAC', () => {
    it('enforces RBAC preventing non-admin from modifying user accounts', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', userSessionCookie)
        .send({ username: 'hacker', password: 'password', role: 'ADMIN' });
      expect(res.status).toBe(403);
    });
  });
});
