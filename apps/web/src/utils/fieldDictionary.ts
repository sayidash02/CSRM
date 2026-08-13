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
