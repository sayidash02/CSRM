export function parseSharePointLinks(value: string | null | undefined): string[] {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // Preserve a malformed legacy value as a single editable link.
    }
  }

  return [trimmed];
}

export function serializeSharePointLinks(links: readonly string[]): string {
  const normalized = links.map((link) => link.trim()).filter(Boolean);
  if (normalized.length === 0) return '';
  if (normalized.length === 1) return normalized[0];
  return JSON.stringify(normalized);
}

export function isSafeSharePointUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}
