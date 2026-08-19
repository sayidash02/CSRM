import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { DailyActivityMomExportService } from '../../src/services/excel/DailyActivityMomExportService';

const prisma = new PrismaClient();

describe('DailyActivityMomExportService Unit Tests', () => {
  let catId: bigint;
  let subCatId: bigint;
  let picId1: bigint;
  let picId2: bigint;
  let activityId: bigint;

  beforeAll(async () => {
    let cat = await prisma.categories.findFirst({ where: { name: 'MOM Test Category' } });
    if (!cat) {
      cat = await prisma.categories.create({ data: { name: 'MOM Test Category' } });
    }
    catId = cat.id;

    let subCat = await prisma.sub_categories.findFirst({ where: { name: 'MOM Test Sub' } });
    if (!subCat) {
      subCat = await prisma.sub_categories.create({ data: { category_id: catId, name: 'MOM Test Sub' } });
    }
    subCatId = subCat.id;

    let pic1 = await prisma.pics.findFirst({ where: { name: 'PIC JSP 1' } });
    if (!pic1) {
      pic1 = await prisma.pics.create({ data: { name: 'PIC JSP 1' } });
    }
    picId1 = pic1.id;

    let pic2 = await prisma.pics.findFirst({ where: { name: 'PIC JSP 2' } });
    if (!pic2) {
      pic2 = await prisma.pics.create({ data: { name: 'PIC JSP 2' } });
    }
    picId2 = pic2.id;

    const activity = await prisma.daily_activities.create({
      data: {
        activity_date: new Date('2026-05-25T00:00:00.000Z'),
        activity: 'Komunikasi Nelayan Cilamaya Girang',
        institution_group: '1. Anggota Nelayan\n2. Tokoh Masyarakat',
        address: 'Rumah Bapak Asep',
        location: 'Cilamaya Girang',
        focus: 'Pengajuan Bantuan Nelayan',
        cost: 1500000,
        category_id: catId,
        sub_category_id: subCatId,
        keterangan: 'Koordinasi terkait pengajuan proposal bantuan peralatan tangkap',
        hasil: 'Perlu verifikasi data nelayan anggota',
        kesimpulan: 'Nelayan sepakat mengajukan data perwakilan',
        next_plan: 'Kunjungan verifikasi minggu depan',
        document_link: 'https://sharepoint.com/site/crms/notulensi.xlsx',
        is_deleted: false,
        daily_activity_pics: {
          create: [{ pic_id: picId1 }, { pic_id: picId2 }]
        }
      }
    });
    activityId = activity.id;
  });

  afterAll(async () => {
    if (activityId) {
      await prisma.daily_activity_pics.deleteMany({ where: { activity_id: activityId } });
      await prisma.daily_activities.delete({ where: { id: activityId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('generateSingleMomBuffer should produce a valid Excel workbook with exact MOM structure', async () => {
    const { buffer, fileName } = await DailyActivityMomExportService.generateSingleMomBuffer(activityId.toString());
    
    expect(fileName).toMatch(/^MOM_.*\.xlsx$/);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('Daily Notes');
    expect(sheet).toBeDefined();

    const headerCell = sheet!.getCell('A1');
    expect(headerCell.value).toBe('External Affairs - Daily Notes');

    const titleCell = sheet!.getCell('A2');
    expect(String(titleCell.value)).toContain('Komunikasi Nelayan Cilamaya Girang');

    const colAValues: string[] = [];
    sheet!.eachRow((row) => {
      const val = row.getCell(1).value;
      if (typeof val === 'string') {
        colAValues.push(val);
      }
    });

    expect(colAValues.some(v => v.includes('Lokasi'))).toBe(true);
    expect(colAValues.some(v => v.includes('Venue'))).toBe(true);
    expect(colAValues.some(v => v.toLowerCase().includes('hari'))).toBe(true);
    expect(colAValues.some(v => v.includes('Tanggal'))).toBe(true);
    expect(colAValues.some(v => v.includes('Category'))).toBe(true);
    expect(colAValues.some(v => v.includes('Sub Category'))).toBe(true);
    expect(colAValues.some(v => v.includes('Fokus'))).toBe(true);
    expect(colAValues.some(v => v.includes('Biaya'))).toBe(true);
    expect(colAValues.some(v => v.includes('Attendees'))).toBe(true);
    expect(colAValues.some(v => v.includes('Keterangan Pertemuan'))).toBe(true);
    expect(colAValues.some(v => v.includes('Hasil Pertemuan'))).toBe(true);
    expect(colAValues.some(v => v.includes('Kesimpulan'))).toBe(true);
    expect(colAValues.some(v => v.toLowerCase().includes('next plan'))).toBe(true);
    expect(colAValues.some(v => v.includes('Supporting Documents'))).toBe(true);
  });

  it('generateMomWorkbookBuffer should produce a multi-sheet workbook with Rekap and individual MOM sheets', async () => {
    const { buffer, fileName, count } = await DailyActivityMomExportService.generateMomWorkbookBuffer({
      year: '2026',
      is_deleted: false
    });

    expect(fileName).toMatch(/^Daily_Activities_MOM_Workbook_.*\.xlsx$/);
    expect(count).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const rekapSheet = workbook.getWorksheet('Rekap Daily Activities');
    expect(rekapSheet).toBeDefined();

    const headerRow = rekapSheet!.getRow(1);
    const headers = headerRow.values as string[];
    expect(headers).toContain('Daily Title / Kegiatan');
    expect(headers).toContain('Kesimpulan');
    expect(headers).toContain('Next Plan');
    expect(headers).toContain('Supporting Documents');

    expect(workbook.worksheets.length).toBeGreaterThan(1);
  });
});
