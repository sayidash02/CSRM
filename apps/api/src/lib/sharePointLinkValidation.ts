const ATTACHMENT_FIELDS = [
  'document_link',
  'main_document',
  'supporting_document',
  'proposal_file',
  'assessment_file',
  'documentation_image',
  'document',
  'supporting_files',
  'sharepoint_link',
] as const;

const MAX_LINK_LENGTH = 4096;

function parseLinkList(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
        return null;
      }
      return parsed.map((item) => (item as string).trim()).filter(Boolean);
    } catch {
      return null;
    }
  }

  return [trimmed];
}

export function validateAttachmentLinkValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > MAX_LINK_LENGTH) return false;

  const links = parseLinkList(value);
  if (!links) return false;

  return links.every((link) => {
    // Allow safe internal uploaded file paths (e.g. /uploads/...)
    if (link.startsWith('/uploads/') && !link.includes('..')) {
      return true;
    }
    if (link.startsWith('file://') && !link.includes('javascript:')) {
      return true;
    }

    try {
      const url = new URL(link);
      if (url.protocol === 'https:' && Boolean(url.hostname)) {
        return true;
      }
      if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
}

export function validateAttachmentLinks(
  body: Record<string, unknown> | undefined,
): { field: string } | null {
  if (!body) return null;

  for (const field of ATTACHMENT_FIELDS) {
    if (field in body && !validateAttachmentLinkValue(body[field])) {
      return { field };
    }
  }

  return null;
}

export function attachmentLinkValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const invalid = validateAttachmentLinks(req.body);
  if (invalid) {
    res.status(400).json({
      error: `Invalid SharePoint link in field: ${invalid.field}`,
    });
    return;
  }

  next();
}
import { NextFunction, Request, Response } from 'express';
