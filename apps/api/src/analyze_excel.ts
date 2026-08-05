import ExcelJS from 'exceljs';

async function analyzeExcel() {
  const filePath = 'C:\\Users\\sasha\\OneDrive\\Documents\\Prototype modern user interface\\CRS.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log(`Found ${workbook.worksheets.length} sheets:`);
  
  workbook.eachSheet((worksheet, sheetId) => {
    console.log(`\n--- Sheet: ${worksheet.name} ---`);
    const headerRow = worksheet.getRow(1).values;
    const secondRow = worksheet.getRow(2).values;
    
    console.log(`Headers:`, JSON.stringify(headerRow));
    console.log(`Row 2 (Example):`, JSON.stringify(secondRow));
  });
}

analyzeExcel().catch(console.error);
