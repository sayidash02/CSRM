import { getImageDimensions } from '../excel/MomAttachmentResolver';

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export type MomPhoto = {
  data: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
  originalName: string;
  sortOrder: number;
  width: number;
  height: number;
};

export type MomMetadata = {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
};

export type MomSection = {
  title: string;
  body: string;
  minimumHeight: number;
};

export type MomDocumentModel = {
  id: string;
  docId: string;
  year: number;
  title: string;
  dateLabel: string;
  dayLabel: string;
  metadata: MomMetadata[];
  internalAttendees: string[];
  externalAttendees: string[];
  sections: MomSection[];
  photos: MomPhoto[];
  photoSummary: string;
  creatorName: string;
  approverName: string;
};

export const formatIndonesianDate = (value: Date | string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()] ?? '-'} ${date.getFullYear()}`;
};

export const getIndonesianDay = (value: Date | string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return INDONESIAN_DAYS[date.getDay()] ?? '-';
};

export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return '-';
  return `Rp ${number.toLocaleString('id-ID')}`;
};

const cleanText = (value: unknown, fallback = '-'): string => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const parseList = (value: unknown): string[] => String(value ?? '')
  .split(/\r?\n/)
  .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
  .filter(Boolean);

const getPicNames = (activity: any): string[] => {
  const direct = Array.isArray(activity?.pics)
    ? activity.pics.map((pic: any) => pic?.name)
    : [];
  const joined = Array.isArray(activity?.daily_activity_pics)
    ? activity.daily_activity_pics.map((item: any) => item?.pic?.name)
    : [];
  return [...direct, ...joined].filter((name): name is string => Boolean(name));
};

const imageMime = (mimeType: unknown, originalName: unknown): 'image/jpeg' | 'image/png' | null => {
  const mime = String(mimeType ?? '').toLowerCase();
  const name = String(originalName ?? '').toLowerCase();
  if (mime === 'image/png' || name.endsWith('.png')) return 'image/png';
  if (mime === 'image/jpeg' || mime === 'image/jpg' || /\.jpe?g$/.test(name)) return 'image/jpeg';
  return null;
};

export const getActivityPhotos = (activity: any): MomPhoto[] => {
  const photos = Array.isArray(activity?.photos) ? activity.photos : [];
  return photos
    .filter((photo: any) => photo && photo.is_deleted !== true && photo.photo_data)
    .map((photo: any, index: number): MomPhoto | null => {
      const mimeType = imageMime(photo.mime_type, photo.original_name);
      if (!mimeType) return null;
      const data = Buffer.from(photo.photo_data);
      const dimensions = getImageDimensions(data);
      return {
        data,
        mimeType,
        originalName: cleanText(photo.original_name, `photo-${index + 1}`),
        sortOrder: Number(photo.sort_order ?? index),
        width: dimensions.width,
        height: dimensions.height,
      };
    })
    .filter((photo: MomPhoto | null): photo is MomPhoto => photo !== null)
    .sort((left: MomPhoto, right: MomPhoto) => left.sortOrder - right.sortOrder);
};

export const safeFilePart = (value: string): string => value
  .replace(/[^a-zA-Z0-9_\-\s]/g, '')
  .trim()
  .replace(/\s+/g, '_')
  .slice(0, 40) || 'Activity';

export const buildMomDocumentModel = (activity: any): MomDocumentModel => {
  const date = activity?.activity_date;
  const year = date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).getFullYear() : 2026;
  const id = String(activity?.id ?? '0');
  const picNames = getPicNames(activity);
  const photos = getActivityPhotos(activity);
  const externalAttendees = parseList(activity?.institution_group);

  return {
    id,
    docId: `JSP-EA-MOM-${year}-${id.padStart(3, '0')}`,
    year,
    title: cleanText(activity?.activity),
    dateLabel: formatIndonesianDate(date),
    dayLabel: getIndonesianDay(date),
    metadata: [
      { leftLabel: 'Hari & Tanggal', leftValue: `${getIndonesianDay(date)}, ${formatIndonesianDate(date)}`, rightLabel: 'Lokasi Wilayah', rightValue: cleanText(activity?.location) },
      { leftLabel: 'Venue / Tempat', leftValue: cleanText(activity?.address), rightLabel: 'PIC Internal JSP', rightValue: picNames.join(', ') || '-' },
      { leftLabel: 'Kategori', leftValue: cleanText(activity?.category?.name), rightLabel: 'Sub Kategori', rightValue: cleanText(activity?.sub_category?.name) },
      { leftLabel: 'Fokus Kegiatan', leftValue: cleanText(activity?.focus), rightLabel: 'Anggaran / Biaya', rightValue: formatCurrency(activity?.cost) },
    ],
    internalAttendees: picNames.length > 0 ? picNames : ['Tim Internal JSP'],
    externalAttendees: externalAttendees.length > 0 ? externalAttendees : ['-'],
    sections: [
      { title: 'II. RINGKASAN & AGENDA PERTEMUAN', body: cleanText(activity?.keterangan ?? activity?.description_result), minimumHeight: 50 },
      { title: 'III. POIN PEMBAHASAN & HASIL PERTEMUAN', body: cleanText(activity?.hasil ?? activity?.description_result), minimumHeight: 90 },
      { title: 'IV. KESIMPULAN (EXECUTIVE SUMMARY)', body: cleanText(activity?.kesimpulan), minimumHeight: 50 },
      { title: 'V. RENCANA TINDAK LANJUT (NEXT PLAN / ACTION ITEMS)', body: cleanText(activity?.next_plan), minimumHeight: 50 },
    ],
    photos,
    photoSummary: photos.length > 0 ? `Foto dokumentasi tersimpan di CSRM: ${photos.length} file` : 'Foto dokumentasi: -',
    creatorName: picNames.join(', ') || 'Tim CSR / External Affairs',
    approverName: 'External Affairs & CSR Manager',
  };
};
