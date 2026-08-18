import { describe, it, expect } from 'vitest';
import { FIELD_DICTIONARY, translateField, translateValue } from './fieldDictionary';

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

describe('translateValue', () => {
  const mockReferences = {
    pics: [{ id: 1, name: 'John Doe' }, { id: 259, name: 'Budi' }],
    categories: [{ id: 10, name: 'CSR' }],
    sub_categories: [{ id: 20, name: 'Pendidikan' }]
  };

  it('translates pic_id correctly', () => {
    expect(translateValue('pic_id', 259, mockReferences)).toBe('Budi');
    expect(translateValue('pic_id', '1', mockReferences)).toBe('John Doe');
  });

  it('translates category_id correctly', () => {
    expect(translateValue('category_id', '10', mockReferences)).toBe('CSR');
  });

  it('translates sub_category_id correctly', () => {
    expect(translateValue('sub_category_id', 20, mockReferences)).toBe('Pendidikan');
  });

  it('returns raw value if no references provided', () => {
    expect(translateValue('pic_id', 259)).toBe('259');
  });

  it('formats currency values for non-relation fields', () => {
    expect(translateValue('cost', 50000, mockReferences)).toBe('Rp 50.000');
  });

  it('handles null/undefined gracefully', () => {
    expect(translateValue('pic_id', null, mockReferences)).toBe('-');
  });
});
