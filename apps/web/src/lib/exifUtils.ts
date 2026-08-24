/**
 * Pure TypeScript EXIF metadata extractor for JPEG images.
 * Runs in the browser without external binary dependencies.
 */

export interface PhotoExifMetadata {
  hasExif: boolean;
  dateTaken?: Date;
  dateTakenIso?: string; // YYYY-MM-DD
  dateTimeFormatted?: string; // DD/MM/YYYY HH:mm:ss
  cameraMake?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
  gpsFormatted?: string;
  orientation?: number;
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Extracts EXIF metadata from an image File or Blob.
 */
export async function extractExifFromBlob(file: Blob | File): Promise<PhotoExifMetadata> {
  const result: PhotoExifMetadata = {
    hasExif: false,
  };

  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // read first 128KB which contains EXIF headers
    const view = new DataView(buffer);

    // Check if valid JPEG (SOI marker 0xFFD8)
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      return result;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 4) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker (0xFFE1) contains EXIF
      if (marker === 0xffe1) {
        const segmentLength = view.getUint16(offset, false);
        offset += 2;

        // Check for 'Exif\0\0' (0x457869660000)
        if (
          offset + 6 <= length &&
          view.getUint32(offset, false) === 0x45786966 &&
          view.getUint16(offset + 4, false) === 0x0000
        ) {
          result.hasExif = true;
          const tiffOffset = offset + 6;
          parseTiffHeader(view, tiffOffset, result);
        }
        break;
      } else if ((marker & 0xff00) === 0xff00 && marker !== 0xffd8 && marker !== 0xffd9) {
        // Skip other markers (SOF, APP0, APP2, etc.)
        const segmentLength = view.getUint16(offset, false);
        offset += segmentLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn("Could not parse EXIF metadata:", err);
  }

  return result;
}

function parseTiffHeader(view: DataView, tiffOffset: number, result: PhotoExifMetadata) {
  if (tiffOffset + 8 > view.byteLength) return;

  const byteOrderMarker = view.getUint16(tiffOffset, false);
  let littleEndian = false;
  if (byteOrderMarker === 0x4949) {
    // 'II' - Intel little endian
    littleEndian = true;
  } else if (byteOrderMarker === 0x4d4d) {
    // 'MM' - Motorola big endian
    littleEndian = false;
  } else {
    return;
  }

  // TIFF tag 0x002A
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) return;

  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  if (firstIfdOffset < 8) return;

  parseIfd(view, tiffOffset, tiffOffset + firstIfdOffset, littleEndian, result, 0);
}

function parseIfd(
  view: DataView,
  tiffOffset: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: PhotoExifMetadata,
  depth: number
) {
  if (depth > 3 || ifdOffset + 2 > view.byteLength) return;

  const entries = view.getUint16(ifdOffset, littleEndian);
  let offset = ifdOffset + 2;

  let exifSubIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  for (let i = 0; i < entries && offset + 12 <= view.byteLength; i++, offset += 12) {
    const tag = view.getUint16(offset, littleEndian);
    const type = view.getUint16(offset + 2, littleEndian);
    const count = view.getUint32(offset + 4, littleEndian);
    const valueOffset = offset + 8;

    switch (tag) {
      case 0x010f: // Make
        result.cameraMake = readString(view, tiffOffset, valueOffset, count, littleEndian);
        break;
      case 0x0110: // Model
        result.cameraModel = readString(view, tiffOffset, valueOffset, count, littleEndian);
        break;
      case 0x0112: // Orientation
        result.orientation = view.getUint16(valueOffset, littleEndian);
        break;
      case 0x0132: // DateTime
        if (!result.dateTaken) {
          const dateStr = readString(view, tiffOffset, valueOffset, count, littleEndian);
          applyDateString(dateStr, result);
        }
        break;
      case 0x8769: // Exif SubIFD Pointer
        exifSubIfdOffset = tiffOffset + view.getUint32(valueOffset, littleEndian);
        break;
      case 0x8825: // GPS Info IFD Pointer
        gpsIfdOffset = tiffOffset + view.getUint32(valueOffset, littleEndian);
        break;
      case 0xa002: // ExifImageWidth
        result.imageWidth = readNumericValue(view, type, valueOffset, littleEndian);
        break;
      case 0xa003: // ExifImageHeight
        result.imageHeight = readNumericValue(view, type, valueOffset, littleEndian);
        break;
      case 0x9003: // DateTimeOriginal
      case 0x9004: // DateTimeDigitized
        {
          const dateStr = readString(view, tiffOffset, valueOffset, count, littleEndian);
          applyDateString(dateStr, result);
        }
        break;
    }
  }

  // Parse SubIFDs if present
  if (exifSubIfdOffset && exifSubIfdOffset < view.byteLength) {
    parseIfd(view, tiffOffset, exifSubIfdOffset, littleEndian, result, depth + 1);
  }
  if (gpsIfdOffset && gpsIfdOffset < view.byteLength) {
    parseGpsIfd(view, tiffOffset, gpsIfdOffset, littleEndian, result);
  }
}

function parseGpsIfd(
  view: DataView,
  tiffOffset: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: PhotoExifMetadata
) {
  if (ifdOffset + 2 > view.byteLength) return;

  const entries = view.getUint16(ifdOffset, littleEndian);
  let offset = ifdOffset + 2;

  let latDegrees: number[] | null = null;
  let latRef: string | null = null;
  let lonDegrees: number[] | null = null;
  let lonRef: string | null = null;

  for (let i = 0; i < entries && offset + 12 <= view.byteLength; i++, offset += 12) {
    const tag = view.getUint16(offset, littleEndian);
    const count = view.getUint32(offset + 4, littleEndian);
    const valueOffset = offset + 8;

    switch (tag) {
      case 0x0001: // GPSLatitudeRef ('N' or 'S')
        latRef = String.fromCharCode(view.getUint8(valueOffset));
        break;
      case 0x0002: // GPSLatitude (3 rationals: deg, min, sec)
        latDegrees = readRationals(view, tiffOffset, valueOffset, count, littleEndian);
        break;
      case 0x0003: // GPSLongitudeRef ('E' or 'W')
        lonRef = String.fromCharCode(view.getUint8(valueOffset));
        break;
      case 0x0004: // GPSLongitude (3 rationals: deg, min, sec)
        lonDegrees = readRationals(view, tiffOffset, valueOffset, count, littleEndian);
        break;
    }
  }

  if (latDegrees && latDegrees.length >= 3 && latRef) {
    let lat = latDegrees[0] + latDegrees[1] / 60 + latDegrees[2] / 3600;
    if (latRef.toUpperCase() === "S") lat = -lat;
    result.latitude = Number(lat.toFixed(6));
  }

  if (lonDegrees && lonDegrees.length >= 3 && lonRef) {
    let lon = lonDegrees[0] + lonDegrees[1] / 60 + lonDegrees[2] / 3600;
    if (lonRef.toUpperCase() === "W") lon = -lon;
    result.longitude = Number(lon.toFixed(6));
  }

  if (result.latitude !== undefined && result.longitude !== undefined) {
    result.gpsFormatted = `${result.latitude >= 0 ? "+" : ""}${result.latitude}, ${
      result.longitude >= 0 ? "+" : ""
    }${result.longitude}`;
  }
}

function readString(
  view: DataView,
  tiffOffset: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean
): string {
  if (count <= 0) return "";
  let dataOffset = valueOffset;
  if (count > 4) {
    dataOffset = tiffOffset + view.getUint32(valueOffset, littleEndian);
  }
  if (dataOffset + count > view.byteLength) return "";

  let str = "";
  for (let i = 0; i < count; i++) {
    const charCode = view.getUint8(dataOffset + i);
    if (charCode === 0) break; // null-terminated
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

function readNumericValue(view: DataView, type: number, valueOffset: number, littleEndian: boolean): number {
  if (type === 3) {
    // SHORT (16-bit)
    return view.getUint16(valueOffset, littleEndian);
  } else if (type === 4) {
    // LONG (32-bit)
    return view.getUint32(valueOffset, littleEndian);
  }
  return 0;
}

function readRationals(
  view: DataView,
  tiffOffset: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean
): number[] {
  const dataOffset = tiffOffset + view.getUint32(valueOffset, littleEndian);
  const rationals: number[] = [];

  for (let i = 0; i < count && dataOffset + i * 8 + 8 <= view.byteLength; i++) {
    const num = view.getUint32(dataOffset + i * 8, littleEndian);
    const den = view.getUint32(dataOffset + i * 8 + 4, littleEndian);
    rationals.push(den === 0 ? 0 : num / den);
  }

  return rationals;
}

/**
 * Parses EXIF date string formatted as "YYYY:MM:DD HH:MM:SS" into standard format.
 */
export function applyDateString(dateStr: string, result: PhotoExifMetadata) {
  if (!dateStr || dateStr.length < 10) return;
  // Match "YYYY:MM:DD" or "YYYY-MM-DD"
  const match = dateStr.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})(?:\s+(\d{2}):(\d{2}):?(\d{2})?)?/);
  if (match) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = match;
    const isoDate = `${y}-${m}-${d}`;
    const jsDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));

    result.dateTaken = jsDate;
    result.dateTakenIso = isoDate;
    result.dateTimeFormatted = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  }
}
