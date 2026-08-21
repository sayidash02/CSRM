import express from 'express';
import { exportWorkbook } from '../controllers/WorkbookExportController';

const router = express.Router();

// The full workbook endpoint reads database data and fills the sanitized
// company template. It only returns a download; external document storage is
// outside the application boundary.
router.get('/workbook', exportWorkbook);

// Keep the old path as a compatibility alias, but no longer accept arbitrary
// table payloads that could produce a workbook with the wrong structure.
router.post('/excel', exportWorkbook);

export default router;
