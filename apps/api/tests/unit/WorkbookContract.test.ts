import {
  WORKBOOK_MODULES,
  getWorkbookSheetContract,
  LRP_SHEET_HEADERS,
} from '../../src/services/excel/WorkbookContract';

describe('workbook contract', () => {
  it('keeps the seven operational modules in a stable order', () => {
    expect(WORKBOOK_MODULES).toEqual([
      'dailyActivities',
      'stakeholders',
      'topIssues',
      'proposals',
      'csr',
      'grievance',
      'lrp',
    ]);
  });

  it.each([
    ['Daily Activities 2026', 'dailyActivities', 1, 2],
    ['Stakeholder Engagement 2026', 'stakeholders', 4, 5],
    ['Top Issue', 'topIssues', 3, 4],
    ['Proposal 2026', 'proposals', 1, 3],
    ['CSR Project 2026', 'csr', 1, 2],
    ['Grievance 2026', 'grievance', [6, 5], 7],
    ['LRP', 'lrp', [1], 2],
  ])(
    'resolves %s to %s with the source row contract',
    (sheetName, module, headerRows, dataStartRow) => {
      expect(getWorkbookSheetContract(sheetName)).toMatchObject({
        module,
        headerRows: Array.isArray(headerRows) ? headerRows : [headerRows],
        dataStartRow,
      });
    },
  );

  it('does not import hidden helper sheets', () => {
    expect(getWorkbookSheetContract('Raw', 'hidden')).toBeNull();
    expect(getWorkbookSheetContract('Grievance', 'hidden')).toBeNull();
    expect(getWorkbookSheetContract('Master (jangan dihapus)', 'visible')).toBeNull();
  });

  it('defines the new LRP output sheet without file-upload semantics', () => {
    expect(LRP_SHEET_HEADERS).toEqual(['No', 'Program', 'Year']);
    expect(getWorkbookSheetContract('LRP')).toMatchObject({
      canonicalName: 'LRP',
      headers: LRP_SHEET_HEADERS,
    });
  });
});
