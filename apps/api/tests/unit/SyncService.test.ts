import ExcelJS from 'exceljs';
import { SyncService } from '../../src/services/SyncService';

describe('SyncService', () => {
  it('should combine date and venue with a newline for stakeholders', async () => {
    const service = new SyncService({} as any);
    const wb = new ExcelJS.Workbook();
    
    (service as any).addStakeholdersSheet(wb, [{
      stakeholder: 'John Doe',
      date: new Date('2026-06-06T00:00:00.000Z'),
      venue: 'Karanganyar',
      concern_issue: 'Issue',
      document_link: 'http://docs'
    }]);

    const ws = wb.getWorksheet('Stakeholder Engagement');
    const row = ws.getRow(2);
    expect(row.getCell(3).value).toBe('2026-06-06\nKaranganyar');
  });
});
