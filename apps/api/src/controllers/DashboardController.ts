import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get last sync date
    const lastSync = await prisma.sync_log.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { synced_at: 'desc' }
    });
    const lastSyncDate = lastSync ? lastSync.synced_at : new Date(0);

    const [
      totalDaily,
      thisMonthDaily,
      lastMonthDaily,
      thisWeekDaily,
      lastWeekDaily,
      totalStakeholders,
      totalIssues,
      totalProposals,
      proposalsUnderReview,
      staleProposals,
      totalCsr,
      csrOnGoing,
      totalGrievances,
      grievanceHighOpen,
      untouchedGrievances,
      totalLrp,
      recentActivities,
      highPriorityGrievances,
      onGoingCsr,
      dailyByCategory,
      allProposals
    ] = await Promise.all([
      prisma.daily_activities.count({ where: { is_deleted: false } }),
      prisma.daily_activities.count({ where: { is_deleted: false, activity_date: { gte: firstDayThisMonth } } }),
      prisma.daily_activities.count({ where: { is_deleted: false, activity_date: { gte: firstDayLastMonth, lte: lastDayLastMonth } } }),
      prisma.daily_activities.count({ where: { is_deleted: false, activity_date: { gte: sevenDaysAgo } } }),
      prisma.daily_activities.count({ where: { is_deleted: false, activity_date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      
      prisma.stakeholder_engagement.count({ where: { is_deleted: false } }),
      prisma.top_issues.count({ where: { is_deleted: false } }),
      
      prisma.proposals.count({ where: { is_deleted: false } }),
      prisma.proposals.count({ where: { status: 'Under Review', is_deleted: false } }),
      prisma.proposals.count({ where: { status: 'Under Review', is_deleted: false, date_received: { lt: fourteenDaysAgo } } }),
      
      prisma.csr_projects.count({ where: { is_deleted: false } }),
      prisma.csr_projects.count({ where: { status: 'On Going', is_deleted: false } }),
      
      prisma.grievance.count({ where: { is_deleted: false } }),
      prisma.grievance.count({ where: { is_deleted: false, status: { in: ['Open', 'On Progress'] }, significance: { in: ['High', 'Critical'] } } }),
      prisma.grievance.count({ where: { is_deleted: false, status: { in: ['Open', 'On Progress'] }, significance: { in: ['High', 'Critical'] }, investigation: null, resolution: null } }),
      
      prisma.lrp.count({ where: { is_deleted: false } }),
      
      prisma.daily_activities.findMany({
        where: { is_deleted: false },
        orderBy: { activity_date: 'desc' },
        take: 5,
        include: { pic: true, sub_category: true }
      }),
      prisma.grievance.findMany({
        where: { is_deleted: false },
        take: 2
      }),
      prisma.csr_projects.findMany({
        where: { is_deleted: false, status: 'On Going' }
      }),
      prisma.daily_activities.findMany({
        where: { is_deleted: false },
        include: { sub_category: true }
      }),
      prisma.proposals.findMany({
        where: { is_deleted: false },
        select: { status: true }
      })
    ]);

    // Unsynced count calculation
    const [uns1, uns2, uns3, uns4, uns5, uns6, uns7] = await Promise.all([
      prisma.daily_activities.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.stakeholder_engagement.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.top_issues.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.proposals.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.csr_projects.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.grievance.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
      prisma.lrp.count({ where: { is_deleted: false, updated_at: { gt: lastSyncDate } } }),
    ]);
    const unsyncedCount = uns1 + uns2 + uns3 + uns4 + uns5 + uns6 + uns7;

    const dailyTrend = lastMonthDaily === 0 ? (thisMonthDaily > 0 ? 100 : 0) : Math.round(((thisMonthDaily - lastMonthDaily) / lastMonthDaily) * 100);
    const weeklyTrend = lastWeekDaily === 0 ? (thisWeekDaily > 0 ? 100 : 0) : Math.round(((thisWeekDaily - lastWeekDaily) / lastWeekDaily) * 100);

    const categoryCounts: Record<string, number> = {};
    dailyByCategory.forEach((act) => {
      const name = act.sub_category?.name || 'Uncategorized';
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    });
    const dailyByCategoryList = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    const proposalStatusCounts: Record<string, number> = { 'Under Review': 0, 'Approved': 0, 'Declined': 0 };
    allProposals.forEach((p) => {
      if (p.status) { proposalStatusCounts[p.status] = (proposalStatusCounts[p.status] || 0) + 1; }
    });
    const proposalsStatusList = Object.entries(proposalStatusCounts).map(([name, value]) => ({ name, value }));

    const recentActivitiesSerialized = recentActivities.map((act: any) => ({
      ...act, id: act.id.toString(),
      pic_id: act.pic_id?.toString() || null,
      category_id: act.category_id.toString(), sub_category_id: act.sub_category_id.toString(),
      pic: act.pic ? { ...act.pic, id: act.pic.id.toString() } : null,
      sub_category: act.sub_category ? { ...act.sub_category, id: act.sub_category.id.toString(), category_id: act.sub_category.category_id.toString() } : null
    }));

    res.status(200).json({
      data: {
        totals: {
          daily: totalDaily, stakeholder: totalStakeholders, issues: totalIssues,
          proposals: totalProposals, csr: totalCsr, grievance: totalGrievances, lrp: totalLrp
        },
        trends: {
          dailyThisMonth: thisMonthDaily, dailyLastMonth: lastMonthDaily, dailyTrend: dailyTrend,
          weeklyThisWeek: thisWeekDaily, weeklyLastWeek: lastWeekDaily, weeklyTrend: weeklyTrend
        },
        actionable: {
          proposalsUnderReview, csrOnGoing, grievanceHighOpen,
          staleProposals, untouchedGrievances
        },
        charts: {
          dailyByCategory: dailyByCategoryList, proposalsStatus: proposalsStatusList
        },
        recent: {
          activities: recentActivitiesSerialized,
          highPriorityGrievances: highPriorityGrievances.map((g) => ({ ...g, id: g.id.toString() })),
          onGoingCsr: onGoingCsr.map((c) => ({ ...c, id: c.id.toString() }))
        },
        sync: {
          unsyncedCount,
          lastSyncDate: lastSync ? lastSync.synced_at.toISOString() : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

