import { describe, expect, it } from 'vitest';
import {
  isSafeSharePointUrl,
  parseSharePointLinks,
  serializeSharePointLinks,
} from './sharePointLinks';

describe('SharePoint link values', () => {
  it('reads both legacy JSON arrays and single-link values', () => {
    expect(parseSharePointLinks('https://contoso.sharepoint.com/a')).toEqual([
      'https://contoso.sharepoint.com/a',
    ]);
    expect(
      parseSharePointLinks('["https://contoso.sharepoint.com/a", "https://contoso.sharepoint.com/b"]'),
    ).toEqual(['https://contoso.sharepoint.com/a', 'https://contoso.sharepoint.com/b']);
    expect(parseSharePointLinks('[]')).toEqual([]);
  });

  it('serializes one link plainly and multiple links losslessly', () => {
    expect(serializeSharePointLinks([])).toBe('');
    expect(serializeSharePointLinks(['https://contoso.sharepoint.com/a'])).toBe(
      'https://contoso.sharepoint.com/a',
    );
    expect(
      serializeSharePointLinks(['https://contoso.sharepoint.com/a', 'https://contoso.sharepoint.com/b']),
    ).toBe('["https://contoso.sharepoint.com/a","https://contoso.sharepoint.com/b"]');
  });

  it('accepts only absolute HTTPS URLs for new links', () => {
    expect(isSafeSharePointUrl('https://contoso.sharepoint.com/sites/crs')).toBe(true);
    expect(isSafeSharePointUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeSharePointUrl('http://contoso.sharepoint.com/sites/crs')).toBe(false);
    expect(isSafeSharePointUrl('/relative/path')).toBe(false);
  });
});
