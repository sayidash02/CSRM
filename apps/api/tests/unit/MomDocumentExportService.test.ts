import { PDFDocument } from 'pdf-lib';
import { MomDocumentExportService } from '../../src/services/mom/MomDocumentExportService';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const activity = {
  id: 42n,
  activity_date: new Date('2026-05-25T00:00:00.000Z'),
  activity: 'Komunikasi Nelayan Cilamaya Girang',
  institution_group: '1. Anggota Nelayan\n2. Tokoh Masyarakat',
  address: 'Rumah Bapak Asep',
  location: 'Cilamaya Girang',
  focus: 'Pengajuan Bantuan Nelayan',
  cost: 1500000,
  keterangan: 'Koordinasi terkait pengajuan proposal bantuan peralatan tangkap',
  hasil: 'Perlu verifikasi data nelayan anggota',
  kesimpulan: 'Nelayan sepakat mengajukan data perwakilan',
  next_plan: 'Kunjungan verifikasi minggu depan',
  category: { name: 'Stakeholder Engagement' },
  sub_category: { name: 'Donasi' },
  daily_activity_pics: [{ pic: { name: 'PIC JSP 1' } }],
  photos: [{
    photo_data: onePixelPng,
    mime_type: 'image/png',
    original_name: 'lapangan.png',
    sort_order: 0,
    is_deleted: false,
  }],
};

describe('MomDocumentExportService', () => {
  it('renders a single DOCX using the MOM field and photo contract', async () => {
    const { buffer, fileName } = await MomDocumentExportService.renderSingleDocxBuffer(activity);

    expect(fileName).toMatch(/^MOM_.*\.docx$/);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.byteLength).toBeGreaterThan(3000);
  });

  it('renders a single PDF with a page and embedded photo', async () => {
    const { buffer, fileName } = await MomDocumentExportService.renderSinglePdfBuffer(activity);

    expect(fileName).toMatch(/^MOM_.*\.pdf$/);
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPages().length).toBeGreaterThanOrEqual(1);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders a combined document with one MOM section per activity', async () => {
    const secondActivity = { ...activity, id: 43n, activity: 'Rapat Internal' };
    const docx = await MomDocumentExportService.renderCombinedDocxBuffer([activity, secondActivity]);
    const pdf = await MomDocumentExportService.renderCombinedPdfBuffer([activity, secondActivity]);

    expect(docx.fileName).toMatch(/^Daily_Activities_MOM_Workbook_.*\.docx$/);
    expect(docx.buffer.subarray(0, 2).toString()).toBe('PK');
    const pdfDocument = await PDFDocument.load(pdf.buffer);
    expect(pdfDocument.getPages().length).toBeGreaterThanOrEqual(2);
  });
});
