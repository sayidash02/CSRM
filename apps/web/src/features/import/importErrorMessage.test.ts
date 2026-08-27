import { describe, expect, it } from 'vitest';
import { getImportErrorMessage } from './importErrorMessage';

describe('getImportErrorMessage', () => {
  it('reads the structured authentication error returned by the API', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
        },
      },
    };

    expect(getImportErrorMessage(error, 'fallback')).toBe('Authentication required');
  });

  it('reads flat API error and message responses', () => {
    expect(getImportErrorMessage({ response: { data: { error: 'Workbook tidak valid' } } }, 'fallback'))
      .toBe('Workbook tidak valid');
    expect(getImportErrorMessage({ response: { data: { message: 'Upload ditolak' } } }, 'fallback'))
      .toBe('Upload ditolak');
  });

  it('explains a network failure without exposing internal details', () => {
    expect(getImportErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' }, 'fallback'))
      .toBe('Tidak dapat terhubung ke server CRIMEs. Periksa koneksi dan pastikan API sedang berjalan.');
  });

  it('uses the caller fallback for unknown or empty response shapes', () => {
    expect(getImportErrorMessage({ response: { data: { error: { code: 'UNKNOWN' } } } }, 'fallback'))
      .toBe('fallback');
    expect(getImportErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
