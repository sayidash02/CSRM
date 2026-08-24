import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

type DashboardYear = number | null;

const parseDashboardYear = (value: unknown): DashboardYear => {
  if (value === undefined || value === null || value === '' || value === 'All' || value === 'Semua') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
    throw new Error('Parameter year tidak valid');
  }
  return parsed;
};

const yearDateRange = (year: DashboardYear) => year === null
  ? undefined
  : { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

const withDateYear = (base: Record<string, unknown>, field: string, year: DashboardYear) => ({
  ...base,
  ...(year === null ? {} : { [field]: yearDateRange(year) })
});

const withNumericYear = (base: Record<string, unknown>, field: string, year: DashboardYear) => ({
  ...base,
  ...(year === null ? {} : { [field]: year })
});

export const getDashboardStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
  let selectedYear: DashboardYear;
  try {
    selectedYear = parseDashboardYear(req.query.year);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }

  const activeRecord = { is_deleted: false, is_archived: false };
  const dailyWhere = withDateYear(activeRecord, 'activity_date', selectedYear);
  const stakeholderWhere = withDateYear(activeRecord, 'date', selectedYear);
  const proposalWhere = withDateYear(activeRecord, 'date_received', selectedYear);
  const csrWhere = withNumericYear(activeRecord, 'project_year', selectedYear);
  const grievanceWhere = withDateYear(activeRecord, 'log_date', selectedYear);
  const topIssueWhere = withNumericYear(activeRecord, 'year', selectedYear);
  const lrpWhere = withNumericYear(activeRecord, 'year', selectedYear);

  const now = new Date();
  const targetYear = selectedYear ?? now.getFullYear();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalDaily,
    thisMonthDaily,
    lastMonthDaily,
    thisWeekDaily,
    lastWeekDaily,
    totalStakeholders,
    totalIssues,
    totalProposals,
    totalCsr,
    csrOnGoing,
    csrPlanning,
    csrCompleted,
    totalGrievances,
    grievanceHighOpen,
    untouchedGrievances,
    totalLrp,
    totalPhotos,
    recentActivities,
    highPriorityGrievances,
    onGoingCsr,
    allDailyActivities,
    allStakeholderEngagements,
    allProposals,
    allGrievances,
    allCsrProjects,
    recentTopIssues
  ] = await Promise.all([
    prisma.daily_activities.count({ where: dailyWhere }),
    prisma.daily_activities.count({ where: { ...dailyWhere, activity_date: { ...(dailyWhere.activity_date as object || {}), gte: firstDayThisMonth } } }),
    prisma.daily_activities.count({ where: { ...dailyWhere, activity_date: { ...(dailyWhere.activity_date as object || {}), gte: firstDayLastMonth, lte: lastDayLastMonth } } }),
    prisma.daily_activities.count({ where: { ...dailyWhere, activity_date: { ...(dailyWhere.activity_date as object || {}), gte: sevenDaysAgo } } }),
    prisma.daily_activities.count({ where: { ...dailyWhere, activity_date: { ...(dailyWhere.activity_date as object || {}), gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    
    prisma.stakeholder_engagement.count({ where: stakeholderWhere }),
    prisma.top_issues.count({ where: topIssueWhere }),
    prisma.proposals.count({ where: proposalWhere }),
    
    prisma.csr_projects.count({ where: csrWhere }),
    prisma.csr_projects.count({ where: { ...csrWhere, status: 'On Going' } }),
    prisma.csr_projects.count({ where: { ...csrWhere, status: 'Planning' } }),
    prisma.csr_projects.count({ where: { ...csrWhere, status: 'Completed' } }),
    
    prisma.grievance.count({ where: grievanceWhere }),
    prisma.grievance.count({ where: { ...grievanceWhere, status: { in: ['Open', 'On Progress'] }, significance: { in: ['High', 'Critical'] } } }),
    prisma.grievance.count({ where: { ...grievanceWhere, status: { in: ['Open', 'On Progress'] }, significance: { in: ['High', 'Critical'] }, investigation: null, resolution: null } }),
    
    prisma.lrp.count({ where: lrpWhere }),
    prisma.daily_activity_photos.count({ where: { is_deleted: false, activity: dailyWhere } }),
    
    prisma.daily_activities.findMany({
      where: dailyWhere,
      orderBy: { activity_date: 'desc' },
      take: 6,
      include: {
        daily_activity_pics: { include: { pic: true } },
        sub_category: true,
        _count: { select: { photos: { where: { is_deleted: false } } } }
      }
    }),
    prisma.grievance.findMany({
      where: {
        ...grievanceWhere,
        status: { in: ['Open', 'On Progress'] },
        significance: { in: ['High', 'Critical'] }
      },
      orderBy: { log_date: 'desc' },
      take: 4
    }),
    prisma.csr_projects.findMany({
      where: { ...csrWhere, status: 'On Going' },
      orderBy: { budget: 'desc' },
      take: 5
    }),
    prisma.daily_activities.findMany({
      where: dailyWhere,
      select: {
        id: true,
        activity_date: true,
        sub_category: { select: { name: true } },
        daily_activity_pics: { select: { pic: { select: { name: true } } } }
      }
    }),
    prisma.stakeholder_engagement.findMany({
      where: stakeholderWhere,
      select: { id: true, date: true }
    }),
    prisma.proposals.findMany({
      where: proposalWhere,
      select: { status: true }
    }),
    prisma.grievance.findMany({
      where: grievanceWhere,
      select: { status: true, significance: true, category: true }
    }),
    prisma.csr_projects.findMany({
      where: csrWhere,
      select: { status: true, budget: true }
    }),
    prisma.top_issues.findMany({
      where: topIssueWhere,
      orderBy: { created_at: 'desc' },
      take: 4
    })
  ]);

  const dailyTrend = lastMonthDaily === 0 ? (thisMonthDaily > 0 ? 100 : 0) : Math.round(((thisMonthDaily - lastMonthDaily) / lastMonthDaily) * 100);
  const weeklyTrend = lastWeekDaily === 0 ? (thisWeekDaily > 0 ? 100 : 0) : Math.round(((thisWeekDaily - lastWeekDaily) / lastWeekDaily) * 100);

  // 1. Subcategory distribution
  const categoryCounts: Record<string, number> = {};
  const picCounts: Record<string, number> = {};
  const monthlyDailyCounts = new Array(12).fill(0);
  
  allDailyActivities.forEach((act) => {
    const name = act.sub_category?.name || 'Lainnya';
    categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    
    act.daily_activity_pics?.forEach((p) => {
      if (p.pic?.name) {
        picCounts[p.pic.name] = (picCounts[p.pic.name] || 0) + 1;
      }
    });

    if (act.activity_date) {
      const d = new Date(act.activity_date);
      const m = d.getUTCMonth();
      if (m >= 0 && m < 12) {
        monthlyDailyCounts[m] += 1;
      }
    }
  });

  const dailyByCategoryList = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const dailyByPicList = Object.entries(picCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // 2. Stakeholder monthly distribution
  const monthlyStakeholderCounts = new Array(12).fill(0);
  allStakeholderEngagements.forEach((stk) => {
    if (stk.date) {
      const d = new Date(stk.date);
      const m = d.getUTCMonth();
      if (m >= 0 && m < 12) {
        monthlyStakeholderCounts[m] += 1;
      }
    }
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyTimeline = monthNames.map((name, idx) => ({
    month: name,
    monthIndex: idx + 1,
    daily: monthlyDailyCounts[idx],
    stakeholder: monthlyStakeholderCounts[idx]
  }));

  // 3. Proposals status
  let acceptCount = 0;
  let declineCount = 0;
  let reviewCount = 0;
  allProposals.forEach((p) => {
    if (p.status === 'Accept') acceptCount += 1;
    else if (p.status === 'Decline') declineCount += 1;
    else reviewCount += 1;
  });
  const proposalsStatusList = [
    { name: 'Accept', value: acceptCount },
    { name: 'Decline', value: declineCount },
    { name: 'Review', value: reviewCount }
  ];
  const proposalAcceptanceRate = totalProposals > 0 ? Math.round((acceptCount / totalProposals) * 100) : 0;

  // 4. Grievance analytics
  let grievanceClosed = 0;
  let grievanceOpen = 0;
  let grievanceOnProgress = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  allGrievances.forEach((g) => {
    if (g.status === 'Closed') grievanceClosed += 1;
    else if (g.status === 'On Progress') grievanceOnProgress += 1;
    else grievanceOpen += 1;

    const sig = g.significance || 'Medium';
    if (sig === 'Critical') criticalCount += 1;
    else if (sig === 'High') highCount += 1;
    else if (sig === 'Low') lowCount += 1;
    else mediumCount += 1;
  });

  const grievanceResolutionRate = totalGrievances > 0 ? Math.round((grievanceClosed / totalGrievances) * 100) : 100;
  const grievanceBySignificanceList = [
    { name: 'Critical', value: criticalCount },
    { name: 'High', value: highCount },
    { name: 'Medium', value: mediumCount },
    { name: 'Low', value: lowCount }
  ];
  const grievanceByStatusList = [
    { name: 'Open', value: grievanceOpen },
    { name: 'On Progress', value: grievanceOnProgress },
    { name: 'Closed', value: grievanceClosed }
  ];

  // 5. CSR Budget Analytics
  let totalCsrBudget = 0;
  let planningBudget = 0;
  let onGoingBudget = 0;
  let completedBudget = 0;

  allCsrProjects.forEach((proj) => {
    const numBudget = proj.budget ? Number(proj.budget) : 0;
    totalCsrBudget += numBudget;
    if (proj.status === 'On Going') onGoingBudget += numBudget;
    else if (proj.status === 'Planning') planningBudget += numBudget;
    else if (proj.status === 'Completed') completedBudget += numBudget;
  });

  const csrStatusList = [
    { name: 'Planning', value: csrPlanning, budget: planningBudget },
    { name: 'On Going', value: csrOnGoing, budget: onGoingBudget },
    { name: 'Completed', value: csrCompleted, budget: completedBudget }
  ];

  res.status(200).json({
    data: {
      filters: {
        year: selectedYear,
        targetYear
      },
      totals: {
        daily: totalDaily,
        stakeholder: totalStakeholders,
        issues: totalIssues,
        proposals: totalProposals,
        csr: totalCsr,
        grievance: totalGrievances,
        lrp: totalLrp,
        photos: totalPhotos,
        totalCsrBudget
      },
      trends: {
        dailyThisMonth: thisMonthDaily,
        dailyLastMonth: lastMonthDaily,
        dailyTrend,
        weeklyThisWeek: thisWeekDaily,
        weeklyLastWeek: lastWeekDaily,
        weeklyTrend,
        monthlyTimeline
      },
      actionable: {
        csrOnGoing,
        csrPlanning,
        csrCompleted,
        grievanceHighOpen,
        untouchedGrievances,
        grievanceOpen,
        grievanceClosed,
        grievanceOnProgress,
        grievanceResolutionRate,
        proposalAcceptanceRate,
        totalCsrBudget,
        onGoingBudget
      },
      charts: {
        dailyByCategory: dailyByCategoryList,
        dailyByPic: dailyByPicList,
        proposalsStatus: proposalsStatusList,
        grievanceBySignificance: grievanceBySignificanceList,
        grievanceByStatus: grievanceByStatusList,
        csrByStatus: csrStatusList,
        monthlyTimeline
      },
      recent: {
        activities: recentActivities.map((a: any) => ({
          id: a.id,
          activity: a.activity,
          activity_date: a.activity_date,
          sub_category: a.sub_category,
          pic: a.daily_activity_pics?.[0]?.pic || null,
          photoCount: a._count?.photos || 0
        })),
        highPriorityGrievances: highPriorityGrievances.map((g: any) => ({
          id: g.id,
          regNo: g.register_no,
          name: g.complainant_name,
          description: g.description,
          significance: g.significance,
          status: g.status,
          log_date: g.log_date
        })),
        onGoingCsr: onGoingCsr.map((c: any) => ({
          id: c.id,
          program: c.program,
          budget: Number(c.budget || 0),
          target_beneficiaries: c.target_beneficiaries,
          location: c.location
        })),
        topIssues: recentTopIssues.map((i: any) => ({
          id: i.id,
          issue: i.issue,
          period: i.period,
          year: i.year,
          follow_up: i.follow_up
        }))
      }
    }
  });
});
