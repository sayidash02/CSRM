export interface DocumentLink {
  title?: string | undefined;
  url: string;
}

export const MAX_SHAREPOINT_LINKS = 5;

export function normalizeSharepointLinks(input: unknown): DocumentLink[] | null {
  if (!input) return null;
  
  let rawList: unknown[] = [];
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) rawList = parsed;
      else if (typeof parsed === 'string' && parsed.trim().startsWith('http')) {
        rawList = [{ url: parsed.trim() }];
      }
    } catch {
      if (input.trim().startsWith('http')) {
        rawList = [{ url: input.trim() }];
      }
    }
  }

  if (rawList.length === 0) return null;

  const validLinks: DocumentLink[] = [];

  for (const item of rawList) {
    if (validLinks.length >= MAX_SHAREPOINT_LINKS) break;
    if (!item) continue;

    let url = '';
    let title = '';

    if (typeof item === 'string') {
      url = item.trim();
    } else if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      url = String(obj.url || '').trim();
      title = String(obj.title || '').trim().slice(0, 255);
    }

    if (!url) continue;

    // Validate URL protocol (HTTP/HTTPS only)
    if (!/^https?:\/\//i.test(url)) {
      continue;
    }

    // Limit URL length to 2048 chars
    const sanitizedUrl = url.slice(0, 2048);
    const link: DocumentLink = { url: sanitizedUrl };
    if (title) {
      link.title = title;
    }
    validLinks.push(link);
  }

  return validLinks.length > 0 ? validLinks : null;
}
