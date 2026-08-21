import request from 'supertest';
import app from '../src/app';

const binaryParser = (response: NodeJS.ReadableStream, callback: (error: Error | null, body?: Buffer) => void): void => {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
};
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let catId: bigint;
let subCatId: bigint;
let picId: bigint;

beforeAll(async () => {
  await prisma.daily_activities.deleteMany();

  let subCat = await prisma.sub_categories.findFirst({ where: { name: 'Issue' } });
  if (!subCat) {
    let cat = await prisma.categories.findUnique({ where: { name: 'Stakeholder Engagement' } });
    if (!cat) {
      cat = await prisma.categories.create({ data: { name: 'Stakeholder Engagement' } });
    }
    catId = cat.id;
    subCat = await prisma.sub_categories.create({ data: { category_id: catId, name: 'Issue' } });
  } else {
    catId = subCat.category_id;
  }
  subCatId = subCat.id;

  let pic = await prisma.pics.findFirst({ where: { name: 'Ziya Ramadhani' } });
  if (!pic) {
    pic = await prisma.pics.create({ data: { name: 'Ziya Ramadhani' } });
  }
  picId = pic.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/daily-activities', () => {
  it('Positive: Should create a new daily activity', async () => {
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      keterangan: 'Ket API',
      hasil: 'Hasil API'
    };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.activity).toBe('Kunjungan Lapangan');
    expect(res.body.data.keterangan).toBe('Ket API');
    expect(res.body.data.hasil).toBe('Hasil API');
    expect(res.body.data.description_result).toBe('Ket API - Hasil API');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { activity_date: '2026-07-25' };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(400);
  });


  it('Negative: Should fail if foreign key does not exist', async () => {
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: 999, // Doesn't exist
      category_id: 1,
      sub_category_id: 1
    };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/daily-activities', () => {
  it('Should return list of activities not deleted', async () => {
    const res = await request(app).get('/api/daily-activities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Should sort activities by cost ascending when sort_by=cost&sort_dir=asc', async () => {
    const payload1 = {
      activity_date: '2026-07-25',
      activity: 'Activity Expensive',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 1000000
    };
    const payload2 = {
      activity_date: '2026-07-25',
      activity: 'Activity Cheap',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 50000
    };

    const create1 = await request(app).post('/api/daily-activities').send(payload1);
    const create2 = await request(app).post('/api/daily-activities').send(payload2);

    const res = await request(app).get('/api/daily-activities?sort_by=cost&sort_dir=asc');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const costs = res.body.data.map((item: any) => Number(item.cost)).filter((c: number) => !isNaN(c));
    for (let i = 0; i < costs.length - 1; i++) {
      expect(costs[i]).toBeLessThanOrEqual(costs[i + 1]);
    }

    if (create1.body?.data?.id) await prisma.daily_activities.delete({ where: { id: BigInt(create1.body.data.id) } });
    if (create2.body?.data?.id) await prisma.daily_activities.delete({ where: { id: BigInt(create2.body.data.id) } });
  });
});

describe('DELETE and RESTORE /api/daily-activities/:id', () => {
  it('Should soft delete and then restore an activity', async () => {
    const list = await request(app).get('/api/daily-activities');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/daily-activities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/daily-activities');
    expect(listAfter.body.data.length).toBe(0);

    const listDeleted = await request(app).get('/api/daily-activities?is_deleted=true');
    expect(listDeleted.status).toBe(200);
    expect(listDeleted.body.data.length).toBe(1);
    expect(listDeleted.body.data[0].id).toBe(id);

    const restoreRes = await request(app).patch(`/api/daily-activities/${id}/restore`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.is_deleted).toBe(false);

    const listRestored = await request(app).get('/api/daily-activities');
    expect(listRestored.body.data.length).toBe(1);
  });
});

describe('PUT /api/daily-activities/:id', () => {
  it('Should update an existing activity', async () => {
    // create one first because the previous test deleted it
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
    };
    const createRes = await request(app).post('/api/daily-activities').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      activity_date: '2026-07-26',
      activity: 'Kunjungan Lapangan Updated',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 500000,
      keterangan: 'Keterangan diperbarui',
      hasil: 'Hasil diperbarui'
    };
    
    const res = await request(app).put(`/api/daily-activities/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.activity).toBe('Kunjungan Lapangan Updated');
    expect(res.body.data.cost).toBe('500000');
    expect(res.body.data.keterangan).toBe('Keterangan diperbarui');
    expect(res.body.data.hasil).toBe('Hasil diperbarui');
    expect(res.body.data.description_result).toBe('Keterangan diperbarui - Hasil diperbarui');
  });

  it('Should record audit log when PICs change during update', async () => {
    let newPic = await prisma.pics.findFirst({ where: { name: 'Adji K' } });
    if (!newPic) {
      newPic = await prisma.pics.create({ data: { name: 'Adji K' } });
    }

    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Audit PIC',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
    };
    const createRes = await request(app).post('/api/daily-activities').send(payload);
    const id = createRes.body.data.id;

    const updatePayload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Audit PIC',
      pic_ids: [newPic.id.toString()],
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
    };

    const res = await request(app).put(`/api/daily-activities/${id}`).send(updatePayload);
    expect(res.status).toBe(200);

    const logRes = await request(app).get(`/api/audit-logs/daily_activities/${id}`);
    expect(logRes.status).toBe(200);
    const picLog = logRes.body.data.find((l: any) => l.changes?.pic_id);
    expect(picLog).toBeDefined();
    expect(typeof picLog.changes).toBe('object');
    expect(picLog.changes.pic_id.old).toBe('Ziya Ramadhani');
    expect(picLog.changes.pic_id.new).toBe('Adji K');
  });

  it('Positive: Should support kesimpulan and next_plan in create and update', async () => {
    const createPayload = {
      activity_date: '2026-05-25',
      activity: 'MOM Nelayan Cilamaya',
      institution_group: '1. Anggota Nelayan\n2. Tokoh Masyarakat',
      address: 'Rumah Bapak Asep',
      location: 'Cilamaya Girang',
      focus: 'Pengajuan Bantuan Nelayan',
      cost: 500000,
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      keterangan: 'Komunikasi perihal pengajuan bantuan',
      hasil: 'Perlu verifikasi kelompok penerima',
      kesimpulan: 'Kelompok nelayan sepakat menyusun proposal terpadu',
      next_plan: 'Follow up verifikasi proposal minggu depan'
    };

    const res = await request(app).post('/api/daily-activities').send(createPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.kesimpulan).toBe('Kelompok nelayan sepakat menyusun proposal terpadu');
    expect(res.body.data.next_plan).toBe('Follow up verifikasi proposal minggu depan');

    const id = res.body.data.id;

    const updatePayload = {
      ...createPayload,
      kesimpulan: 'Kesimpulan telah diperbarui',
      next_plan: 'Next plan telah diperbarui'
    };

    const updateRes = await request(app).put(`/api/daily-activities/${id}`).send(updatePayload);
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.kesimpulan).toBe('Kesimpulan telah diperbarui');
    expect(updateRes.body.data.next_plan).toBe('Next plan telah diperbarui');
  });
});

describe('MOM Excel Export Endpoints', () => {
  let createdActivityId: string;

  beforeAll(async () => {
    const payload = {
      activity_date: '2026-05-25',
      activity: 'Komunikasi dengan nelayan ex class action',
      institution_group: '1. Kelompok Nelayan Cilamaya Girang\n2. KUD Mina Bahari',
      address: 'Aula KUD Mina Bahari',
      location: 'Cilamaya Girang',
      focus: 'Pengajuan bantuan nelayan',
      cost: 750000,
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      keterangan: 'Pemaparan program CRS dan diskusi aspirasi',
      hasil: 'Nelayan menyambut baik tawaran program pendampingan',
      kesimpulan: 'Disepakati pembentukan tim perwakilan nelayan',
      next_plan: 'Mengadakan rapat lanjutan penyusunan daftar penerima manfaat',
      document_link: 'https://sharepoint.com/sites/crms/doc1.pdf'
    };
    const res = await request(app).post('/api/daily-activities').send(payload);
    createdActivityId = res.body.data.id;
  });

  it('GET /api/daily-activities/:id/mom - should export single MOM sheet in excel format', async () => {
    const res = await request(app).get(`/api/daily-activities/${createdActivityId}/mom`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="MOM_');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(1000);
  });

  it('exports the same MOM contract as DOCX and PDF', async () => {
    const docx = await request(app).get(`/api/daily-activities/${createdActivityId}/mom?format=docx`).buffer(true).parse(binaryParser as any);
    expect(docx.status).toBe(200);
    expect(docx.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(docx.headers['content-disposition']).toContain('.docx');
    expect(docx.body.subarray(0, 2).toString()).toBe('PK');

    const pdf = await request(app).get(`/api/daily-activities/${createdActivityId}/mom?format=pdf`).buffer(true).parse(binaryParser as any);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('.pdf');
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('GET /api/daily-activities/:id/mom - should return 404 if activity not found', async () => {
    const res = await request(app).get('/api/daily-activities/99999999/mom');
    expect(res.status).toBe(404);
  });

  it('GET /api/daily-activities/export/mom-workbook - should export all-in-one workbook with master and MOM sheets', async () => {
    const res = await request(app).get('/api/daily-activities/export/mom-workbook');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="Daily_Activities_MOM_Workbook_');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(2000);
  });

  it('exports the combined MOM contract as DOCX and PDF', async () => {
    const docx = await request(app).get('/api/daily-activities/export/mom-workbook?format=docx').buffer(true).parse(binaryParser as any);
    expect(docx.status).toBe(200);
    expect(docx.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(docx.body.subarray(0, 2).toString()).toBe('PK');

    const pdf = await request(app).get('/api/daily-activities/export/mom-workbook?format=pdf').buffer(true).parse(binaryParser as any);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('rejects unsupported MOM output formats', async () => {
    const res = await request(app).get(`/api/daily-activities/${createdActivityId}/mom?format=html`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});

describe('Daily Activity Photo Management', () => {
  const sampleJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9]);

  it('should upload, delete, and re-upload the same photo without 409 conflict', async () => {
    // 1. Create an activity
    const actRes = await request(app).post('/api/daily-activities').send({
      activity_date: '2026-07-28',
      activity: 'Kegiatan Foto Test',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
    });
    expect(actRes.status).toBe(201);
    const actId = actRes.body.data.id;

    // 2. Upload photo
    const uploadRes1 = await request(app)
      .post('/api/daily-activities/upload-photo')
      .field('activity_id', actId.toString())
      .attach('file', sampleJpeg, { filename: 'test-photo.jpg', contentType: 'image/jpeg' });
    expect(uploadRes1.status).toBe(201);
    const photoId = uploadRes1.body.data.id;

    // 3. Trying to upload the same active photo should return 409
    const dupRes = await request(app)
      .post('/api/daily-activities/upload-photo')
      .field('activity_id', actId.toString())
      .attach('file', sampleJpeg, { filename: 'test-photo.jpg', contentType: 'image/jpeg' });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toContain('Foto yang sama sudah terpasang');

    // 4. Delete the photo (soft delete)
    const delRes = await request(app).delete(`/api/daily-activities/${actId}/photos/${photoId}`);
    expect(delRes.status).toBe(204);

    // 5. Re-upload the same deleted photo - should succeed and restore the photo
    const uploadRes2 = await request(app)
      .post('/api/daily-activities/upload-photo')
      .field('activity_id', actId.toString())
      .attach('file', sampleJpeg, { filename: 'test-photo.jpg', contentType: 'image/jpeg' });
    expect(uploadRes2.status).toBe(201);
    expect(uploadRes2.body.data.original_name).toBe('test-photo.jpg');

    // 6. Verify photo is accessible
    const getPhotoRes = await request(app).get(`/api/daily-activities/${actId}/photos/${uploadRes2.body.data.id}`);
    expect(getPhotoRes.status).toBe(200);
    expect(getPhotoRes.headers['content-type']).toBe('image/jpeg');
  });
});

