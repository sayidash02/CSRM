import { validateAttachmentLinkValue, validateAttachmentLinks } from '../../src/lib/sharePointLinkValidation';

describe('SharePoint attachment link validation', () => {
  it('accepts empty values, HTTPS links, and legacy JSON link arrays', () => {
    expect(validateAttachmentLinkValue(undefined)).toBe(true);
    expect(validateAttachmentLinkValue('https://contoso.sharepoint.com/sites/crs/doc.pdf')).toBe(true);
    expect(
      validateAttachmentLinkValue(
        '["https://contoso.sharepoint.com/sites/crs/a.pdf","https://contoso.sharepoint.com/sites/crs/b.pdf"]',
      ),
    ).toBe(true);
  });

  it('rejects unsafe schemes, relative paths, and non-string values', () => {
    expect(validateAttachmentLinkValue('http://contoso.sharepoint.com/doc.pdf')).toBe(false);
    expect(validateAttachmentLinkValue('javascript:alert(1)')).toBe(false);
    expect(validateAttachmentLinkValue('doc.pdf')).toBe(false);
    expect(validateAttachmentLinkValue({ url: 'https://contoso.sharepoint.com/doc.pdf' })).toBe(false);
  });

  it('reports the first invalid attachment field for request middleware', () => {
    expect(
      validateAttachmentLinks({
        document_link: 'https://contoso.sharepoint.com/doc.pdf',
        supporting_files: 'not-a-url',
      }),
    ).toEqual({ field: 'supporting_files' });
    expect(validateAttachmentLinks({ activity: 'normal text' })).toBeNull();
  });
});
