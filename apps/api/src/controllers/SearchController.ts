import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export interface SearchResultItem {
  id: string;
  module: 'daily' | 'stakeholder' | 'topissues' | 'proposals' | 'csr' | 'grievance' | 'lrp';
  moduleLabel: string;
  title: string;
  subtitle: string;
  date?: string | null;
  metadata?: Record<string, any>;
}

export const searchOmni = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitPerModule = 10;

  if (!q) {
    res.status(200).json({
      data: [],
      meta: { query: '', total: 0, counts: {} },
    });
    return;
  }

  const activeRecord = { is_deleted: false, is_archived: false };

  const [
    dailyActivities,
    stakeholders,
    topIssues,
    proposals,
    csrProjects,
    grievances,
    lrpPrograms,
  ] = await Promise.all([
    prisma.daily_activities.findMany({
      where: {
        ...activeRecord,
        OR: [
          { activity: { contains: q } },
          { institution_group: { contains: q } },
          { location: { contains: q } },
          { address: { contains: q } },
          { focus: { contains: q } },
          { description_result: { contains: q } },
          { kesimpulan: { contains: q } },
          { next_plan: { contains: q } },
          { keterangan: { contains: q } },
          { hasil: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { activity_date: 'desc' },
      include: {
        sub_category: true,
        category: true,
        daily_activity_pics: { include: { pic: true } },
      },
    }),

    prisma.stakeholder_engagement.findMany({
      where: {
        ...activeRecord,
        OR: [
          { stakeholder: { contains: q } },
          { venue: { contains: q } },
          { concern_issue: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { date: 'desc' },
    }),

    prisma.top_issues.findMany({
      where: {
        ...activeRecord,
        OR: [
          { issue: { contains: q } },
          { description: { contains: q } },
          { follow_up: { contains: q } },
          { next_plan: { contains: q } },
          { period: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { year: 'desc' },
    }),

    prisma.proposals.findMany({
      where: {
        ...activeRecord,
        OR: [
          { registration_no: { contains: q } },
          { institution: { contains: q } },
          { address: { contains: q } },
          { proposal_description: { contains: q } },
          { status: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { date_received: 'desc' },
    }),

    prisma.csr_projects.findMany({
      where: {
        ...activeRecord,
        OR: [
          { program: { contains: q } },
          { activity: { contains: q } },
          { type_of_activity: { contains: q } },
          { location: { contains: q } },
          { target_beneficiaries: { contains: q } },
          { objective: { contains: q } },
          { status: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { project_year: 'desc' },
    }),

    prisma.grievance.findMany({
      where: {
        ...activeRecord,
        OR: [
          { register_no: { contains: q } },
          { complainant_name: { contains: q } },
          { address: { contains: q } },
          { location: { contains: q } },
          { category: { contains: q } },
          { description: { contains: q } },
          { investigation: { contains: q } },
          { resolution: { contains: q } },
          { feedback: { contains: q } },
          { status: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { log_date: 'desc' },
    }),

    prisma.lrp.findMany({
      where: {
        ...activeRecord,
        OR: [
          { program: { contains: q } },
        ],
      },
      take: limitPerModule,
      orderBy: { year: 'desc' },
    }),
  ]);

  const results: SearchResultItem[] = [];

  // Format Daily Activities
  dailyActivities.forEach((item) => {
    const pics = item.daily_activity_pics.map((p) => p.pic?.name).filter(Boolean).join(', ');
    const parts = [
      item.activity_date ? new Date(item.activity_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      item.location || item.institution_group || item.address,
      item.sub_category?.name,
      pics ? `PIC: ${pics}` : null,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'daily',
      moduleLabel: 'Daily Activities',
      title: item.activity,
      subtitle: parts.join(' • ') || 'Aktivitas Lapangan',
      date: item.activity_date?.toISOString(),
      metadata: {
        location: item.location,
        institution_group: item.institution_group,
        subCategory: item.sub_category?.name,
        category: item.category?.name,
      },
    });
  });

  // Format Stakeholders
  stakeholders.forEach((item) => {
    const parts = [
      item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      item.venue,
      item.concern_issue ? `Isu: ${item.concern_issue}` : null,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'stakeholder',
      moduleLabel: 'Stakeholder Engagement',
      title: item.stakeholder || 'Stakeholder tanpa nama',
      subtitle: parts.join(' • ') || 'Engagement Pemangku Kepentingan',
      date: item.date ? item.date.toISOString() : null,
      metadata: { venue: item.venue },
    });
  });

  // Format Top Issues
  topIssues.forEach((item) => {
    const parts = [
      `Periode: ${item.period} (${item.year})`,
      item.description ? item.description.slice(0, 80) : null,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'topissues',
      moduleLabel: 'Top Issues',
      title: item.issue,
      subtitle: parts.join(' • '),
      metadata: { period: item.period, year: item.year },
    });
  });

  // Format Grievances
  grievances.forEach((item) => {
    const parts = [
      `No: ${item.register_no}`,
      item.log_date ? new Date(item.log_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      item.category,
      `Status: ${item.status}`,
      `Tingkat: ${item.significance}`,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'grievance',
      moduleLabel: 'Grievance',
      title: `${item.register_no} — ${item.complainant_name}`,
      subtitle: parts.join(' • '),
      date: item.log_date?.toISOString(),
      metadata: {
        register_no: item.register_no,
        significance: item.significance,
        status: item.status,
      },
    });
  });

  // Format Proposals
  proposals.forEach((item) => {
    const parts = [
      `No: ${item.registration_no}`,
      item.date_received ? new Date(item.date_received).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      `Status: ${item.status}`,
      item.address,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'proposals',
      moduleLabel: 'Proposals',
      title: `${item.institution}${item.proposal_description ? ` — ${item.proposal_description.slice(0, 60)}` : ''}`,
      subtitle: parts.join(' • '),
      date: item.date_received?.toISOString(),
      metadata: {
        registration_no: item.registration_no,
        status: item.status,
      },
    });
  });

  // Format CSR Projects
  csrProjects.forEach((item) => {
    const parts = [
      `Tahun ${item.project_year}`,
      item.location,
      item.type_of_activity,
      `Status: ${item.status}`,
      item.budget ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(item.budget)) : null,
    ].filter(Boolean);

    results.push({
      id: item.id.toString(),
      module: 'csr',
      moduleLabel: 'CSR Projects',
      title: item.program,
      subtitle: parts.join(' • '),
      metadata: {
        year: item.project_year,
        status: item.status,
      },
    });
  });

  // Format LRP
  lrpPrograms.forEach((item) => {
    results.push({
      id: item.id.toString(),
      module: 'lrp',
      moduleLabel: 'Livelihood Restoration (LRP)',
      title: item.program,
      subtitle: `Tahun ${item.year} • Program Pemulihan Mata Pencaharian`,
      metadata: { year: item.year },
    });
  });

  const counts: Record<string, number> = {
    daily: dailyActivities.length,
    stakeholder: stakeholders.length,
    topissues: topIssues.length,
    grievance: grievances.length,
    proposals: proposals.length,
    csr: csrProjects.length,
    lrp: lrpPrograms.length,
  };

  res.status(200).json({
    data: results,
    meta: {
      query: q,
      total: results.length,
      counts,
    },
  });
});
