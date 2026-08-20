import prisma from '../../lib/prisma';
import { truncStr } from './ExcelWorkbookValidator';
import {
  makeCsrProjectIdentity,
  makeDailyActivityIdentity,
  makeGrievanceFallbackIdentity,
  makeGrievanceIdentity,
  makeImportIdentity,
  makeLrpIdentity,
  makeProposalFallbackIdentity,
  makeProposalIdentity,
  makeStakeholderIdentity,
  makeTopIssueIdentity
} from './ImportIdentity';
import { mergeImportedRows } from './ImportDuplicateGuard';

export interface WorkbookDailyActivityRow {
  activity_date: Date;
  activity: string;
  institution_group: string | null;
  address: string | null;
  focus: string | null;
  location: string | null;
  keterangan: string | null;
  hasil: string | null;
  description_result: string | null;
  cost: number | null;
  document_link: string | null;
  pic_names: string[];
  category_name: string;
  sub_category_name: string;
}

export interface WorkbookStakeholderRow {
  stakeholder: string;
  date: Date | null;
  venue: string | null;
  concern_issue: string | null;
  document_link: string | null;
}

export interface WorkbookTopIssueRow {
  period: string;
  year: number;
  issue: string;
  description: string | null;
  follow_up: string | null;
  main_document: string | null;
  supporting_document: string | null;
  next_plan: string | null;
}

export interface WorkbookLrpRow {
  program: string;
  year: number;
  sharepoint_link: string;
}

export interface WorkbookProposalRow {
  registration_no: string;
  source_registration_no: string | null;
  date_received: Date;
  institution: string;
  address: string | null;
  proposal_description: string | null;
  proposal_file: string | null;
  assessment_file: string | null;
  status: string;
}

export interface WorkbookCsrRow {
  project_year: number;
  program: string;
  activity: string | null;
  type_of_activity: string | null;
  location: string | null;
  target_beneficiaries: string | null;
  objective: string | null;
  status: string;
  budget: number | null;
  implementation_period: string | null;
  documentation_image: string | null;
  document: string | null;
}

export interface WorkbookGrievanceRow {
  register_no: string;
  source_register_no: string | null;
  log_date: Date;
  complainant_name: string;
  address: string | null;
  phone: string | null;
  category: string | null;
  significance: string;
  description: string | null;
  location: string | null;
  investigation: string | null;
  resolution: string | null;
  feedback: string | null;
  status: string;
  remarks: string | null;
  supporting_files: string | null;
}

export interface WorkbookCommitInput {
  dailyActivities: WorkbookDailyActivityRow[];
  stakeholders: WorkbookStakeholderRow[];
  topIssues: WorkbookTopIssueRow[];
  lrps: WorkbookLrpRow[];
  proposals: WorkbookProposalRow[];
  csr: WorkbookCsrRow[];
  grievances: WorkbookGrievanceRow[];
}

export async function commitWorkbookRows(input: WorkbookCommitInput): Promise<void> {
  const {
    dailyActivities: rawDailyActivities,
    stakeholders: rawStakeholders,
    topIssues: rawTopIssues,
    lrps: rawLrps,
    proposals: rawProposals,
    csr: rawCsr,
    grievances: rawGrievance
  } = input;

  await prisma.$transaction(
    async (tx) => {
      // 1. Resolve / Create PICs
      const existingPics = await tx.pics.findMany();
      const picMap = new Map<string, bigint>();
      for (const p of existingPics) {
        picMap.set(p.name.trim().toLowerCase(), p.id);
      }

      const uniquePicsToCreate = new Map<string, string>();
      for (const item of rawDailyActivities) {
        for (const p of item.pic_names) {
          const trimmed = p.trim();
          const norm = trimmed.toLowerCase();
          if (norm && !picMap.has(norm) && !uniquePicsToCreate.has(norm)) {
            uniquePicsToCreate.set(norm, trimmed);
          }
        }
      }
      for (const [norm, name] of uniquePicsToCreate.entries()) {
        const created = await tx.pics.create({ data: { name } });
        picMap.set(norm, created.id);
      }

      // 2. Resolve / Create Categories
      const existingCategories = await tx.categories.findMany();
      const categoryMap = new Map<string, bigint>();
      for (const c of existingCategories) {
        categoryMap.set(c.name.trim().toLowerCase(), c.id);
      }

      const uniqueCatsToCreate = new Map<string, string>();
      for (const item of rawDailyActivities) {
        const trimmed = item.category_name.trim();
        const norm = trimmed.toLowerCase();
        if (norm && !categoryMap.has(norm) && !uniqueCatsToCreate.has(norm)) {
          uniqueCatsToCreate.set(norm, trimmed);
        }
      }
      for (const [norm, name] of uniqueCatsToCreate.entries()) {
        const created = await tx.categories.create({ data: { name } });
        categoryMap.set(norm, created.id);
      }

      // 3. Resolve / Create SubCategories
      const existingSubCategories = await tx.sub_categories.findMany();
      const subCategoryMap = new Map<string, bigint>();
      for (const sc of existingSubCategories) {
        subCategoryMap.set(`${sc.category_id}:${sc.name.trim().toLowerCase()}`, sc.id);
      }

      const uniqueSubCatsToCreate = new Map<string, { categoryId: bigint; name: string }>();
      for (const item of rawDailyActivities) {
        const catNorm = item.category_name.trim().toLowerCase();
        const catId = categoryMap.get(catNorm);
        if (!catId) continue;

        const trimmedSub = item.sub_category_name.trim();
        const subNorm = trimmedSub.toLowerCase();
        const subKey = `${catId}:${subNorm}`;
        if (subNorm && !subCategoryMap.has(subKey) && !uniqueSubCatsToCreate.has(subKey)) {
          uniqueSubCatsToCreate.set(subKey, { categoryId: catId, name: trimmedSub });
        }
      }
      for (const [subKey, val] of uniqueSubCatsToCreate.entries()) {
        const created = await tx.sub_categories.create({
          data: { category_id: val.categoryId, name: val.name }
        });
        subCategoryMap.set(subKey, created.id);
      }

      // 4. Insert Daily Activities
      const existingDailyActivities = rawDailyActivities.length > 0
        ? await tx.daily_activities.findMany({
            where: { is_deleted: false },
            include: { daily_activity_pics: { select: { pic_id: true } } }
          })
        : [];
      const dailyImportRows = rawDailyActivities.map((item) => {
        const categoryId = categoryMap.get(item.category_name.trim().toLowerCase())!;
        const subCategoryId = subCategoryMap.get(`${categoryId}:${item.sub_category_name.trim().toLowerCase()}`)!;
        const picIds = item.pic_names.map(p => picMap.get(p.trim().toLowerCase())!).filter(Boolean);
        return {
          item,
          categoryId,
          subCategoryId,
          picIds,
          identity: makeDailyActivityIdentity(item, categoryId, subCategoryId, picIds)
        };
      });

      await mergeImportedRows({
        existing: existingDailyActivities,
        incoming: dailyImportRows,
        getIncomingIdentity: row => row.identity,
        getExistingIdentities: row => [
          makeDailyActivityIdentity(row, row.category_id, row.sub_category_id, row.daily_activity_pics.map(pic => pic.pic_id))
        ],
        create: row => tx.daily_activities.create({
          data: {
            activity_date: row.item.activity_date,
            activity: row.item.activity,
            institution_group: row.item.institution_group ? truncStr(row.item.institution_group, 255) : null,
            address: row.item.address,
            focus: row.item.focus,
            location: row.item.location,
            keterangan: row.item.keterangan,
            hasil: row.item.hasil,
            description_result: row.item.description_result,
            category_id: row.categoryId,
            sub_category_id: row.subCategoryId,
            cost: row.item.cost,
            document_link: row.item.document_link,
            daily_activity_pics: {
              create: row.picIds.map(id => ({ pic_id: id }))
            }
          },
          include: { daily_activity_pics: { select: { pic_id: true } } }
        }),
        mergeExisting: async (existing, row) => {
          if (row.item.document_link && existing.document_link !== row.item.document_link) {
            await tx.daily_activities.update({
              where: { id: existing.id },
              data: { document_link: row.item.document_link }
            });
            existing.document_link = row.item.document_link;
          }
        }
      });

      // 5. Insert Stakeholders Engagement
      const existingStakeholders = rawStakeholders.length > 0
        ? await tx.stakeholder_engagement.findMany({ where: { is_deleted: false } })
        : [];
      const stakeholderImportRows = rawStakeholders.map((s) => ({
        stakeholder: s.stakeholder ? truncStr(s.stakeholder, 255) : null,
        date: s.date,
        venue: s.venue,
        concern_issue: s.concern_issue,
        document_link: s.document_link
      }));

      await mergeImportedRows({
        existing: existingStakeholders,
        incoming: stakeholderImportRows,
        getIncomingIdentity: row => makeStakeholderIdentity(row),
        getExistingIdentities: row => [makeStakeholderIdentity(row)],
        create: row => tx.stakeholder_engagement.create({ data: row }),
        mergeExisting: async (existing, row) => {
          if (row.document_link && existing.document_link !== row.document_link) {
            await tx.stakeholder_engagement.update({
              where: { id: existing.id },
              data: { document_link: row.document_link }
            });
            existing.document_link = row.document_link;
          }
        }
      });

      // 6. Insert Top Issues
      const existingTopIssues = rawTopIssues.length > 0
        ? await tx.top_issues.findMany({ where: { is_deleted: false } })
        : [];
      await mergeImportedRows({
        existing: existingTopIssues,
        incoming: rawTopIssues,
        getIncomingIdentity: row => makeTopIssueIdentity(row.period, row.issue, row.year),
        getExistingIdentities: row => [makeTopIssueIdentity(row.period, row.issue, row.year)],
        create: row => tx.top_issues.create({ data: row }),
        mergeExisting: async (existing, row) => {
          const updateData: {
            main_document?: string;
            supporting_document?: string;
          } = {};

          if (!existing.main_document && row.main_document) {
            updateData.main_document = row.main_document;
            existing.main_document = row.main_document;
          }
          if (!existing.supporting_document && row.supporting_document) {
            updateData.supporting_document = row.supporting_document;
            existing.supporting_document = row.supporting_document;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.top_issues.update({ where: { id: existing.id }, data: updateData });
          }
        }
      });

      // 7. Insert Proposals
      const existingProposalsForImport = rawProposals.length > 0
        ? await tx.proposals.findMany({ orderBy: { is_deleted: 'asc' } })
        : [];
      await mergeImportedRows({
        existing: existingProposalsForImport,
        incoming: rawProposals,
        getIncomingIdentity: row => makeProposalIdentity(row),
        getExistingIdentities: row => [
          makeImportIdentity('proposal-registration', row.registration_no),
          makeProposalFallbackIdentity(row)
        ],
        create: row => {
          const { source_registration_no: _sourceRegistrationNo, ...proposalData } = row;
          return tx.proposals.create({ data: proposalData });
        },
        mergeExisting: async (existing, row) => {
          const updateData: {
            proposal_file?: string;
            assessment_file?: string;
          } = {};

          if (!existing.is_deleted && !existing.proposal_file && row.proposal_file) {
            updateData.proposal_file = row.proposal_file;
            existing.proposal_file = row.proposal_file;
          }
          if (!existing.is_deleted && !existing.assessment_file && row.assessment_file) {
            updateData.assessment_file = row.assessment_file;
            existing.assessment_file = row.assessment_file;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.proposals.update({ where: { id: existing.id }, data: updateData });
          }
        }
      });

      // 8. Insert CSR
      const existingCsrProjects = rawCsr.length > 0
        ? await tx.csr_projects.findMany({ where: { is_deleted: false } })
        : [];
      await mergeImportedRows({
        existing: existingCsrProjects,
        incoming: rawCsr,
        getIncomingIdentity: row => makeCsrProjectIdentity(row),
        getExistingIdentities: row => [makeCsrProjectIdentity(row)],
        create: row => tx.csr_projects.create({ data: row }),
        mergeExisting: async (existing, row) => {
          const updateData: {
            documentation_image?: string;
            document?: string;
          } = {};

          if (!existing.documentation_image && row.documentation_image) {
            updateData.documentation_image = row.documentation_image;
            existing.documentation_image = row.documentation_image;
          }
          if (!existing.document && row.document) {
            updateData.document = row.document;
            existing.document = row.document;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.csr_projects.update({ where: { id: existing.id }, data: updateData });
          }
        }
      });

      // 9. Insert Grievance
      const existingGrievancesForImport = rawGrievance.length > 0
        ? await tx.grievance.findMany({ orderBy: { is_deleted: 'asc' } })
        : [];
      await mergeImportedRows({
        existing: existingGrievancesForImport,
        incoming: rawGrievance,
        getIncomingIdentity: row => makeGrievanceIdentity(row),
        getExistingIdentities: row => [
          makeImportIdentity('grievance-register', row.register_no),
          makeGrievanceFallbackIdentity(row)
        ],
        create: row => {
          const { source_register_no: _sourceRegisterNo, ...grievanceData } = row;
          return tx.grievance.create({ data: grievanceData });
        },
        mergeExisting: async (existing, row) => {
          if (!existing.is_deleted && !existing.supporting_files && row.supporting_files) {
            await tx.grievance.update({
              where: { id: existing.id },
              data: { supporting_files: row.supporting_files }
            });
            existing.supporting_files = row.supporting_files;
          }
        }
      });

      // 10. Insert LRP records. Year and HTTPS link are part of the
      // lossless workbook contract, so an import cannot silently fall back
      // to a created_at year or a local path.
      const existingLrps = rawLrps.length > 0
        ? await tx.lrp.findMany({ where: { is_deleted: false } })
        : [];
      await mergeImportedRows({
        existing: existingLrps,
        incoming: rawLrps,
        getIncomingIdentity: row => makeLrpIdentity(row.program, row.year),
        getExistingIdentities: row => [makeLrpIdentity(row.program, row.year)],
        create: row => tx.lrp.create({ data: row }),
        mergeExisting: async () => undefined,
      });
    },
    {
      maxWait: 30000,
      timeout: 180000
    }
  );
}
