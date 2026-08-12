import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const getAvailableYears = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const currentYear = new Date().getFullYear();

  // Query DISTINCT tahun dari tiap tabel menggunakan raw query agar efisien
  const [dailyYears, stakeholderYears, proposalYears, csrYears, grievanceYears, topIssueYears, lrpYears] =
    await Promise.all([
      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT YEAR(activity_date) AS y
        FROM daily_activities
        WHERE is_deleted = FALSE AND activity_date IS NOT NULL`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT YEAR(date) AS y
        FROM stakeholder_engagement
        WHERE is_deleted = FALSE AND date IS NOT NULL`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT YEAR(date_received) AS y
        FROM proposals
        WHERE is_deleted = FALSE`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT project_year AS y
        FROM csr_projects
        WHERE is_deleted = FALSE`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT YEAR(log_date) AS y
        FROM grievance
        WHERE is_deleted = FALSE`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT year AS y
        FROM top_issues
        WHERE is_deleted = FALSE`,

      prisma.$queryRaw<{ y: number }[]>`
        SELECT DISTINCT year AS y
        FROM lrp
        WHERE is_deleted = FALSE`,
    ]);

  const allRaw = [
    ...dailyYears,
    ...stakeholderYears,
    ...proposalYears,
    ...csrYears,
    ...grievanceYears,
    ...topIssueYears,
    ...lrpYears,
  ];

  const yearSet = new Set<number>([currentYear]);
  for (const row of allRaw) {
    if (row.y !== null && row.y !== undefined) {
      yearSet.add(Number(row.y));
    }
  }

  const years = Array.from(yearSet).sort((a, b) => b - a);
  res.status(200).json({ data: years });
});
