# Dashboard Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengoptimalkan halaman dashboard agar menampilkan data *real-time* dan notifikasi yang actionable seperti proposal kadaluarsa, grievance yang belum ditangani, tren aktivitas mingguan, dan status sinkronisasi SharePoint.

**Architecture:** Kita memodifikasi *endpoint* `GET /api/dashboard` agar mengirimkan *field* tambahan (`actionable`, `trends`, `sync`). Di *frontend*, komponen `DashboardModule.tsx` diperbarui untuk membaca *field* tersebut dan menampilkan banner peringatan, status sync, dan badge indikator secara *real-time*.

**Tech Stack:** Node.js (Express), Prisma ORM, React, TypeScript, Tailwind CSS, Jest (Supertest).

---

### Task 1: Write Integration Tests for Dashboard New Stats

**Files:**
- Create: `apps/api/tests/dashboard.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear related tables to ensure predictable counts
  await prisma.proposals.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.sync_log.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/dashboard', () => {
  it('Should return updated dashboard stats structure with new metrics', async () => {
    // Insert mock data for stale proposals
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20); // > 14 days ago
    
    await prisma.proposals.create({
      data: {
        registration_no: 'PRP-TEST-001',
        date_received: oldDate,
        institution: 'Test Inst',
        status: 'Under Review',
        is_deleted: false
      }
    });

    // Insert mock data for untouched grievance
    await prisma.grievance.create({
      data: {
        register_no: 'GRV-TEST-001',
        log_date: new Date(),
        complainant_name: 'John',
        significance: 'High',
        status: 'Open',
        investigation: null,
        resolution: null,
        is_deleted: false
      }
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    
    const { actionable, trends, sync } = res.body.data;
    
    // Check Actionable
    expect(actionable.staleProposals).toBe(1);
    expect(actionable.untouchedGrievances).toBe(1);
    
    // Check Trends (should have weekly properties)
    expect(trends).toHaveProperty('weeklyThisWeek');
    expect(trends).toHaveProperty('weeklyLastWeek');
    expect(trends).toHaveProperty('weeklyTrend');
    
    // Check Sync
    expect(sync).toHaveProperty('unsyncedCount');
    expect(sync).toHaveProperty('lastSyncDate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && dotenv -e .env.test -- npx jest tests/dashboard.test.ts`
Expected: FAIL (because the new properties don't exist in the response).

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/dashboard.test.ts
git commit -m "test: add failing integration test for new dashboard stats"
```

### Task 2: Implement Backend Logic for Dashboard Stats

**Files:**
- Modify: `apps/api/src/controllers/DashboardController.ts`

- [ ] **Step 1: Write the implementation**

Edit `apps/api/src/controllers/DashboardController.ts`. Update `getDashboardStats` logic to calculate the new metrics. Look closely at the file content and apply the additions around `Promise.all` and response mapping.

```typescript
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
        include: { daily_activity_pics: { include: { pic: true } }, sub_category: true }
      }),
      prisma.grievance.findMany({
        where: { is_deleted: false, status: { in: ['Open', 'On Progress'] }, significance: { in: ['High', 'Critical'] } },
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
      pic_ids: act.daily_activity_pics?.map((p: any) => p.pic_id.toString()) || [],
      category_id: act.category_id.toString(), sub_category_id: act.sub_category_id.toString(),
      pics: act.daily_activity_pics?.map((p: any) => ({ ...p.pic, id: p.pic.id.toString() })) || [],
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd apps/api && dotenv -e .env.test -- npx jest tests/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/DashboardController.ts
git commit -m "feat: add actionable metrics, weekly trends, and sync status to dashboard API"
```

### Task 3: Update Dashboard UI

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx`

- [ ] **Step 1: Write the implementation**

Update `DashboardModule.tsx`. Add missing UI logic for the banners, Sync indicators, and badging. Apply the changes accurately.

```tsx
import { useMemo, useState } from "react";
import {
  Calendar, Users, AlertTriangle, FileText, Leaf, MessageSquareWarning,
  TrendingUp, TrendingDown, ChevronRight, BarChart2, Check, ArrowUpRight,
  UploadCloud, AlertCircle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { ImportWizardModal } from "../import/ImportWizardModal";

export interface DashboardStats {
  totals: {
    daily: number; stakeholder: number; issues: number; proposals: number;
    csr: number; grievance: number; lrp: number;
  };
  trends: {
    dailyThisMonth: number; dailyLastMonth: number; dailyTrend: number;
    weeklyThisWeek: number; weeklyLastWeek: number; weeklyTrend: number;
  };
  actionable: {
    proposalsUnderReview: number; csrOnGoing: number; grievanceHighOpen: number;
    staleProposals: number; untouchedGrievances: number;
  };
  charts: {
    dailyByCategory: Array<{ name: string; value: number }>;
    proposalsStatus: Array<{ name: string; value: number; color: string }>;
  };
  recent: {
    activities: Array<{ id: string; activity: string; activity_date: string; pic?: { name: string } | null; sub_category?: { name: string } | null; }>;
    highPriorityGrievances: Array<{ id: string; regNo: string; name: string; description: string; significance: string; }>;
    onGoingCsr: Array<{ id: string; program: string; budget: number; }>;
  };
  sync?: {
    unsyncedCount: number;
    lastSyncDate: string | null;
  };
}

interface DashboardModuleProps {
  stats: DashboardStats | null;
  onNav: (module: any) => void;
}

const CHART_COLORS = ["#1D4ED8", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#64748B", "#EC4899", "#14B8A6"];

const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

function SignificanceBadge({ level }: { level: string }) {
  const map: Record<string, string> = { Low: "bg-slate-100 text-slate-500", Medium: "bg-amber-100 text-amber-700", High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[level] ?? "bg-slate-100 text-slate-600"}`}>{level}</span>;
}

export default function DashboardModule({ stats, onNav }: DashboardModuleProps) {
  const [showImportWizard, setShowImportWizard] = useState(false);

  const catData = useMemo(() => stats?.charts?.dailyByCategory || [], [stats]);
  const pieData = useMemo(() => (stats?.charts?.proposalsStatus || []).filter((d) => d.value > 0), [stats]);

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-blue-100 border-t-blue-500 animate-spin" style={{ borderWidth: 3, borderStyle: "solid" }} />
          <p className="text-sm font-medium">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Daily Activities", value: stats.totals.daily,
      sub: `M: ${stats.trends.weeklyThisWeek} vs ${stats.trends.weeklyLastWeek} | B: ${stats.trends.dailyThisMonth} vs ${stats.trends.dailyLastMonth}`,
      trend: stats.trends.weeklyTrend, icon: <Calendar size={16} />, color: "text-blue-600", bg: "bg-blue-50", module: "daily",
    },
    { label: "Stakeholder Meetings", value: stats.totals.stakeholder, sub: "pertemuan stakeholder", icon: <Users size={16} />, color: "text-violet-600", bg: "bg-violet-50", module: "stakeholder" },
    { label: "Active Issues", value: stats.totals.issues, sub: "isu dipantau", icon: <AlertTriangle size={16} />, color: "text-amber-600", bg: "bg-amber-50", module: "topissues" },
    {
      label: "Proposal", value: stats.totals.proposals, sub: `${stats.actionable.proposalsUnderReview} menunggu review`,
      icon: <FileText size={16} />, color: "text-teal-600", bg: "bg-teal-50", module: "proposals",
      badge: stats.actionable.staleProposals > 0 ? `🔥 ${stats.actionable.staleProposals} > 2 mgg` : undefined
    },
    { label: "CSR Project", value: stats.totals.csr, sub: `${stats.actionable.csrOnGoing} sedang berjalan`, icon: <Leaf size={16} />, color: "text-emerald-600", bg: "bg-emerald-50", module: "csr" },
    { label: "Grievance", value: stats.totals.grievance, sub: `${stats.actionable.grievanceHighOpen} prioritas tinggi`, icon: <MessageSquareWarning size={16} />, color: "text-red-600", bg: "bg-red-50", module: "grievance" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 space-y-5">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ringkasan statistik dan aktivitas terkini CRMS</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sync Indicator */}
          {stats.sync && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${stats.sync.unsyncedCount > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {stats.sync.unsyncedCount > 0 ? (
                <><RefreshCw size={14} className="animate-spin-slow" /> {stats.sync.unsyncedCount} pending sync</>
              ) : (
                <><Check size={14} /> Tersinkronisasi</>
              )}
            </div>
          )}
          <button onClick={() => setShowImportWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150">
            <UploadCloud size={15} /> Import Master Excel
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {(stats.actionable.staleProposals > 0 || stats.actionable.untouchedGrievances > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2">
          {stats.actionable.staleProposals > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>Terdapat <strong>{stats.actionable.staleProposals}</strong> proposal Under Review lebih dari 2 minggu yang butuh perhatian.</span>
            </div>
          )}
          {stats.actionable.untouchedGrievances > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>Terdapat <strong>{stats.actionable.untouchedGrievances}</strong> grievance prioritas tinggi yang belum ditindaklanjuti sama sekali.</span>
            </div>
          )}
        </div>
      )}

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <button key={s.label} onClick={() => onNav(s.module)} className="relative bg-card rounded-xl p-4 border border-border text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            {s.badge && (
              <span className="absolute top-4 right-4 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {s.badge}
              </span>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex items-center gap-1">
                {s.trend !== undefined && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${s.trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {s.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {s.trend >= 0 ? `+${s.trend}%` : `${s.trend}%`}
                  </span>
                )}
                <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono">{s.value}</div>
            <div className="text-xs font-medium text-foreground mt-0.5">{s.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Aktivitas per Sub Category</h2>
            </div>
            <button onClick={() => onNav("daily")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Lihat semua <ChevronRight size={12} /></button>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "DM Mono, monospace" }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Belum ada data aktivitas</div>
            )}
          </div>
        </div>

        <div className="col-span-2 bg-card rounded-xl border border-border flex flex-col">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Status Proposal</h2>
            <button onClick={() => onNav("proposals")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Detail <ChevronRight size={12} /></button>
          </div>
          <div className="p-4 flex-1" style={{ height: 220 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={36} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Belum ada data proposal</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities & Actionable Items */}
      <div className="grid grid-cols-5 gap-4">
        {/* Kegiatan Terbaru */}
        <div className="col-span-3 bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Kegiatan Terbaru</h2>
            <button onClick={() => onNav("daily")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Lihat semua <ChevronRight size={12} /></button>
          </div>
          <div className="divide-y divide-border">
            {stats.recent.activities.length > 0 ? (
              stats.recent.activities.slice(0, 5).map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors">
                  <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={13} className="text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{a.activity}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{formatDate(a.activity_date)} · {a.pic?.name || "Belum ada PIC"}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">{a.sub_category?.name || "Lainnya"}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">Belum ada kegiatan terbaru</div>
            )}
          </div>
        </div>

        {/* Right side: Grievance Prioritas & CSR Budget */}
        <div className="col-span-2 space-y-3">
          {/* Grievance Prioritas */}
          {stats.recent.highPriorityGrievances.length > 0 ? (
            stats.recent.highPriorityGrievances.slice(0, 2).map((g) => (
              <div key={g.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <MessageSquareWarning size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5"><span className="text-xs font-mono text-red-600 font-semibold">{g.regNo}</span><SignificanceBadge level={g.significance} /></div>
                    <div className="text-sm font-semibold text-red-700 truncate">{g.name}</div>
                    <div className="text-xs text-red-500 mt-0.5 line-clamp-2 leading-relaxed">{g.description}</div>
                    <button onClick={() => onNav("grievance")} className="mt-2 text-xs text-red-600 font-medium hover:underline flex items-center gap-1">Tinjau <ChevronRight size={11} /></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <div><div className="text-sm font-semibold text-emerald-700">Tidak ada grievance prioritas tinggi</div><div className="text-xs text-emerald-600 mt-0.5">Semua isu aktif berstatus rendah.</div></div>
            </div>
          )}

          {/* CSR Budget (On Going) */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">CSR Budget (On Going)</div>
            {stats.recent.onGoingCsr.length > 0 ? (
              stats.recent.onGoingCsr.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-foreground truncate max-w-[140px]">{c.program}</span><span className="font-mono text-muted-foreground shrink-0 ml-2">{formatIDR(c.budget)}</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (c.budget / 500000000) * 100)}%` }} /></div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground py-2">Tidak ada program CSR berjalan</div>
            )}
          </div>
        </div>
      </div>

      {showImportWizard && <ImportWizardModal onClose={() => setShowImportWizard(false)} onSuccess={() => window.location.reload()} />}
    </div>
  );
}
```

- [ ] **Step 2: Check Typescript and React build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "feat: display actionable dashboard metrics and sync status"
```
