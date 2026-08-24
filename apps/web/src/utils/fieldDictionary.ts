export const FIELD_DICTIONARY: Record<string, string> = {
  // Daily Activities
  cost: 'Biaya',
  keterangan: 'Keterangan',
  hasil: 'Hasil',
  description_result: 'Keterangan & Hasil',
  status: 'Status',
  activity: 'Aktivitas',
  activity_date: 'Tanggal Aktivitas',
  location: 'Lokasi',
  budget: 'Anggaran',
  issue: 'Isu',
  focus: 'Fokus',
  institution_group: 'Institusi/Kelompok',
  address: 'Alamat',
  pic_id: 'PIC',
  category_id: 'Kategori',
  sub_category_id: 'Sub Kategori',
  
  // Stakeholder Engagement
  stakeholder: 'Nama Stakeholder',
  date: 'Tanggal',
  venue: 'Tempat / Lokasi',
  concern_issue: 'Concern / Isu yang Dibahas',

  // Top Issues
  period: 'Periode',
  year: 'Tahun',
  description: 'Deskripsi',
  follow_up: 'Tindak Lanjut',
  next_plan: 'Rencana Selanjutnya',

  // Proposals
  registration_no: 'No Registrasi',
  date_received: 'Tanggal Diterima',
  institution: 'Institusi / Pemohon',
  proposal_description: 'Deskripsi Proposal',

  // CSR Projects
  project_year: 'Tahun Proyek',
  program: 'Program',
  type_of_activity: 'Bentuk Kegiatan',
  target_beneficiaries: 'Target / Sasaran',
  objective: 'Tujuan',
  implementation_period: 'Periode Pelaksanaan',

  // Grievance
  register_no: 'No Registrasi',
  log_date: 'Tanggal Aduan',
  complainant_name: 'Nama Pelapor',
  phone: 'No Telepon',
  category: 'Kategori',
  significance: 'Signifikansi',
  investigation: 'Hasil Investigasi',
  resolution: 'Resolusi',
  feedback: 'Feedback Pelapor',
  completion_date: 'Tanggal Selesai',
  remarks: 'Catatan',

  // LRP
};

export const translateField = (key: string): string => {
  return FIELD_DICTIONARY[key] || key;
};

const isIsoDate = (val: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val);
};

export const translateValue = (field: string, value: any, references?: any): string => {
  if (value === null || value === undefined || value === '') return '-';

  // Relation lookups
  if (references) {
    if ((field === 'pic_id' || field === 'pic_ids') && references.pics) {
      if (Array.isArray(value)) {
        const names = value
          .map((id: any) => references.pics.find((p: any) => String(p.id) === String(id))?.name)
          .filter(Boolean);
        if (names.length > 0) return names.join(', ');
      }
      const match = references.pics.find((p: any) => String(p.id) === String(value));
      if (match) return match.name;
    }
    
    if (field === 'category_id' && references.categories) {
      const match = references.categories.find((c: any) => String(c.id) === String(value));
      if (match) return match.name;
    }
    
    if (field === 'sub_category_id' && references.sub_categories) {
      const match = references.sub_categories.find((s: any) => String(s.id) === String(value));
      if (match) return match.name;
    }
  }

  // Format currency
  if (field === 'cost' || field === 'budget') {
    const num = Number(value);
    if (!isNaN(num)) {
      return `Rp ${num.toLocaleString('id-ID')}`;
    }
  }

  // Format date
  if (
    (field.includes('date') || field === 'created_at' || field === 'updated_at') &&
    typeof value === 'string' &&
    isIsoDate(value)
  ) {
    const dateObj = new Date(value);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  return String(value);
};
