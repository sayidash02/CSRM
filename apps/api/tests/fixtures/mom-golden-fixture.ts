/**
 * Anonymous, deterministic fixture for the MOM golden-output gate.
 *
 * Excel remains the approved layout reference. DOCX and PDF are generated
 * from the same database-shaped activity and are compared against the Excel
 * render during workstation/server UAT.
 */

const RED_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAFAAAAA8AQMAAADL6a/PAAAAA1BMVEX/AAAZ4gk3AAAAD0lEQVQoz2NgGAWjYHABAAKUAAGJaaorAAAAAElFTkSuQmCC';
const BLUE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAFAAAAA8AQMAAADL6a/PAAAAA1BMVEUAAP+KeNJXAAAAD0lEQVQoz2NgGAWjYHABAAKUAAGJaaorAAAAAElFTkSuQmCC';

export const goldenPhotoPng = Buffer.from(RED_PIXEL_PNG_BASE64, 'base64');
export const goldenPhotoPngSecond = Buffer.from(BLUE_PIXEL_PNG_BASE64, 'base64');

export const goldenMomActivity = {
  id: 9001n,
  activity_date: new Date('2026-06-15T00:00:00.000Z'),
  activity: 'Golden Fixture Activity',
  institution_group: 'Stakeholder A\nStakeholder B',
  address: 'Golden Venue',
  location: 'Golden Location',
  focus: 'Golden Focus',
  cost: 125000,
  keterangan: 'Golden agenda text for deterministic output.',
  hasil: 'Golden result text for deterministic output.',
  kesimpulan: 'Golden conclusion text for deterministic output.',
  next_plan: 'Golden next plan text for deterministic output.',
  category: { name: 'Golden Category' },
  sub_category: { name: 'Golden Sub Category' },
  daily_activity_pics: [{ pic: { name: 'Golden PIC' } }],
  photos: [
    {
      photo_data: goldenPhotoPng,
      mime_type: 'image/png',
      original_name: 'golden-photo-1.png',
      sort_order: 0,
      is_deleted: false,
    },
    {
      photo_data: goldenPhotoPngSecond,
      mime_type: 'image/png',
      original_name: 'golden-photo-2.png',
      sort_order: 1,
      is_deleted: false,
    },
  ],
} as const;

export const goldenMomExpected = {
  docId: 'JSP-EA-MOM-2026-9001',
  title: 'Golden Fixture Activity',
  dateLabel: '15 Juni 2026',
  photoCount: 2,
  sectionTitles: [
    'II. RINGKASAN & AGENDA PERTEMUAN',
    'III. POIN PEMBAHASAN & HASIL PERTEMUAN',
    'IV. KESIMPULAN (EXECUTIVE SUMMARY)',
    'V. RENCANA TINDAK LANJUT (NEXT PLAN / ACTION ITEMS)',
  ],
} as const;
