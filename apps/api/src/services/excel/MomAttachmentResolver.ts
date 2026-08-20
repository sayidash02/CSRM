import fs from 'fs';
import path from 'path';

const tryGetLocalImagePath = (link: string | null | undefined): string | null => {
  if (!link) return null;
  // Local image resolution is a mock adapter and must never run in production.
  if (process.env.NODE_ENV === 'production') return null;
  try {
    let clean = link.trim();

    // Never turn a client-supplied file:// URI into a server filesystem path.
    if (clean.toLowerCase().startsWith('file:')) return null;

    // If it's http(s) URL pointing to /uploads/
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const url = new URL(clean);
        clean = decodeURIComponent(url.pathname);
      } catch {}
    }

    // Direct check
    if (fs.existsSync(clean) && fs.statSync(clean).isFile()) {
      return clean;
    }

    // Strip leading /uploads/ or uploads/
    const withoutUploads = clean.replace(/^[/\\]*(?:uploads[/\\])?/, '');

    const candidates = [
      path.resolve(process.cwd(), clean),
      path.resolve(process.cwd(), withoutUploads),
      path.resolve(process.cwd(), '.sharepoint_mock', withoutUploads),
      path.resolve(process.cwd(), 'apps', 'api', '.sharepoint_mock', withoutUploads),
      path.resolve(process.cwd(), '..', '.sharepoint_mock', withoutUploads),
      path.resolve(process.cwd(), '..', 'apps', 'api', '.sharepoint_mock', withoutUploads)
    ];

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
  } catch (err) {
    // Ignore fs check errors
  }
  return null;
};

export const parseLinkList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          .map((s) => s.trim());
      }
    } catch {}
  }
  return [trimmed];
};

export const tryGetLocalImagePaths = (rawLink: string | null | undefined): string[] => {
  const links = parseLinkList(rawLink);
  const results: string[] = [];
  for (const l of links) {
    const local = tryGetLocalImagePath(l);
    if (local && !results.includes(local)) {
      results.push(local);
    }
  }
  return results;
};

export const getImageDimensions = (buffer: Buffer): { width: number; height: number } => {
  try {
    // 1. PNG
    if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) return { width, height };
    }

    // 2. GIF
    if (buffer.length >= 10 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      if (width > 0 && height > 0) return { width, height };
    }

    // 3. JPEG
    if (buffer.length >= 4 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (
          marker !== undefined &&
          ((marker >= 0xC0 && marker <= 0xC3) ||
           (marker >= 0xC5 && marker <= 0xC7) ||
           (marker >= 0xC9 && marker <= 0xCB) ||
           (marker >= 0xCD && marker <= 0xCF))
        ) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch (err) {
    // Fallback if parsing fails
  }
  return { width: 600, height: 400 };
};
