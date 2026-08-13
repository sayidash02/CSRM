export const FIELD_DICTIONARY: Record<string, string> = {
  cost: 'Biaya',
  description_result: 'Keterangan & Hasil',
  status: 'Status',
  activity: 'Aktivitas',
  activity_date: 'Tanggal Aktivitas',
  location: 'Lokasi',
  budget: 'Anggaran',
  issue: 'Isu',
  institution_group: 'Institusi/Kelompok',
  address: 'Alamat',
  pic_id: 'PIC',
  category_id: 'Kategori',
  sub_category_id: 'Sub Kategori',
  document_link: 'Link Dokumen',
  complainant_name: 'Nama Pelapor',
  register_no: 'No Registrasi',
  significance: 'Signifikansi',
  resolution: 'Resolusi',
  remarks: 'Catatan'
};

export const translateField = (key: string): string => {
  return FIELD_DICTIONARY[key] || key;
};

export const translateValue = (field: string, value: any, references?: any): string => {
  if (value === null || value === undefined) return '-';
  if (!references) return String(value);

  const numValue = Number(value);
  
  if (field === 'pic_id' && references.pics) {
    const match = references.pics.find((p: any) => Number(p.id) === numValue);
    if (match) return match.name;
  }
  
  if (field === 'category_id' && references.categories) {
    const match = references.categories.find((c: any) => Number(c.id) === numValue);
    if (match) return match.name;
  }
  
  if (field === 'sub_category_id' && references.sub_categories) {
    const match = references.sub_categories.find((s: any) => Number(s.id) === numValue);
    if (match) return match.name;
  }
  
  return String(value);
};

