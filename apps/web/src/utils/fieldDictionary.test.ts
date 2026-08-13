import { describe, it, expect } from 'vitest';
import { FIELD_DICTIONARY, translateField } from './fieldDictionary';

describe('fieldDictionary', () => {
  it('should translate known database fields to Indonesian labels', () => {
    expect(translateField('cost')).toBe('Biaya');
    expect(translateField('status')).toBe('Status');
    expect(translateField('description_result')).toBe('Keterangan & Hasil');
    expect(translateField('complainant_name')).toBe('Nama Pelapor');
  });

  it('should fallback to the key itself if translation is missing', () => {
    expect(translateField('unknown_field')).toBe('unknown_field');
    expect(translateField('')).toBe('');
  });

  it('should contain mappings for standard audit log fields', () => {
    expect(FIELD_DICTIONARY).toHaveProperty('cost');
    expect(FIELD_DICTIONARY).toHaveProperty('activity_date');
    expect(FIELD_DICTIONARY).toHaveProperty('pic_id');
  });
});
