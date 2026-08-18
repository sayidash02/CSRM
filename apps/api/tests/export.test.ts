import request from 'supertest';
import ExcelJS from 'exceljs';
import app from '../src/app';

const binaryParser = (response: NodeJS.ReadableStream, callback: (error: Error | null, body?: Buffer) => void): void => {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
};

describe('GET /api/export/workbook', () => {
  it('returns a full workbook from the sanitized template without SharePoint upload', async () => {
    const response = await request(app)
      .get('/api/export/workbook?year=All')
      .buffer(true)
      .parse(binaryParser as any);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('CRS-operational-all-years.xlsx');
    expect(response.headers['x-workbook-year']).toBe('all');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as any);
    expect(workbook.getWorksheet('Daily Activities 2026')).toBeDefined();
    expect(workbook.getWorksheet('LRP')).toBeDefined();
    expect(workbook.getWorksheet('Master (jangan dihapus)')).toBeDefined();
  }, 30000);

  it('rejects an invalid year before querying the workbook', async () => {
    const response = await request(app).get('/api/export/workbook?year=1800');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Parameter year tidak valid');
  });
});
