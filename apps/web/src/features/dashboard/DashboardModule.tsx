import { useMemo, useState } from "react";
import {
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  Leaf,
  MessageSquareWarning,
  TreePine,
  ChevronRight,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  UploadCloud,
  AlertCircle,
  Image as ImageIcon,
  Activity,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { ImportWizardModal } from "../import/ImportWizardModal";

export interface DashboardStats {
  filters?: {
    year?: number | null;
    targetYear?: number;
  };
  totals: {
    daily: number;
    stakeholder: number;
    issues: number;
    proposals: number;
    csr: number;
    grievance: number;
    lrp: number;
    photos?: number;
    totalCsrBudget?: number;
  };
  trends: {
    dailyThisMonth: number;
    dailyLastMonth: number;
    dailyTrend: number;
    weeklyThisWeek: number;
    weeklyLastWeek: number;
    weeklyTrend: number;
    stakeholderThisMonth?: number;
    stakeholderLastMonth?: number;
    stakeholderTrend?: number;
    monthlyTimeline?: Array<{
      month: string;
      monthIndex: number;
      daily: number;
      stakeholder: number;
    }>;
  };
  actionable: {
    csrOnGoing: number;
    csrPlanning?: number;
    csrCompleted?: number;
    grievanceHighOpen: number;
    untouchedGrievances: number;
    grievanceOpen?: number;
    grievanceClosed?: number;
    grievanceOnProgress?: number;
    grievanceResolutionRate?: number;
    proposalAcceptanceRate?: number;
    totalCsrBudget?: number;
    onGoingBudget?: number;
  };
  charts: {
    dailyByCategory: Array<{ name: string; value: number }>;
    dailyByPic?: Array<{ name: string; value: number }>;
    proposalsStatus: Array<{ name: string; value: number; color?: string }>;
    grievanceBySignificance?: Array<{ name: string; value: number }>;
    grievanceByStatus?: Array<{ name: string; value: number }>;
    csrByStatus?: Array<{ name: string; value: number; budget: number }>;
    monthlyTimeline?: Array<{
      month: string;
      monthIndex: number;
      daily: number;
      stakeholder: number;
    }>;
  };
  recent: {
    activities: Array<{
      id: string;
      activity: string;
      activity_date: string;
      pic?: { name: string } | null;
      sub_category?: { name: string } | null;
      photoCount?: number;
    }>;
    highPriorityGrievances: Array<{
      id: string;
      regNo: string;
      name: string;
      description: string;
      significance: string;
      status?: string;
      log_date?: string;
    }>;
    onGoingCsr: Array<{
      id: string;
      program: string;
      budget: number;
      target_beneficiaries?: string;
      location?: string;
    }>;
    topIssues?: Array<{
      id: string;
      issue: string;
      period: string;
      year: number;
      follow_up?: string;
    }>;
  };
}

interface DashboardModuleProps {
  stats: DashboardStats | null;
  onNav: (module: any) => void;
}

const PALETTE = ["#2F6B4F", "#3D8A66", "#C47F2A", "#B4552F", "#6F6A5C", "#14201B", "#8A8577"];

const formatIDR = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
};

const formatIDRCompact = (n: number | null | undefined) => {
  const val = Number(n) || 0;
  if (val >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(1)} M`;
  }
  if (val >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(0)} Jt`;
  }
  return formatIDR(val);
};

const formatDate = (d: string) => {
  if (!d) return "-";
  const dateOnly = String(d).split("T")[0];
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (month >= 0 && month < 12) {
      return `${day} ${months[month]} ${year}`;
    }
  }
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export default function DashboardModule({ stats, onNav }: DashboardModuleProps) {
  const [showImportWizard, setShowImportWizard] = useState(false);

  const catData = useMemo(() => stats?.charts?.dailyByCategory || [], [stats]);
  const picData = useMemo(() => stats?.charts?.dailyByPic || [], [stats]);
  const timelineData = useMemo(() => stats?.charts?.monthlyTimeline || stats?.trends?.monthlyTimeline || [], [stats]);
  const pieData = useMemo(() => (stats?.charts?.proposalsStatus || []).filter((d) => d.value > 0), [stats]);

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-slate">
          <div className="w-8 h-8 rounded-full border-2 border-forest/30 border-t-forest animate-spin" />
          <p className="text-[13px] font-medium">Memuat statistik lengkap dashboard CSRM...</p>
        </div>
      </div>
    );
  }

  const resolutionRate = stats.actionable.grievanceResolutionRate ?? 
    (stats.totals.grievance > 0 
      ? Math.round(((stats.actionable.grievanceClosed ?? 0) / stats.totals.grievance) * 100) 
      : 100);

  const acceptanceRate = stats.actionable.proposalAcceptanceRate ?? 0;
  const totalBudget = stats.totals.totalCsrBudget ?? stats.actionable.totalCsrBudget ?? 0;

  const kpis = [
    {
      id: "daily",
      label: "Daily Activities",
      value: stats.totals.daily,
      unit: "kegiatan",
      badge: stats.totals.photos !== undefined ? `${stats.totals.photos} foto arsip` : undefined,
      trendText: stats.trends.weeklyTrend !== 0
        ? `${stats.trends.weeklyTrend > 0 ? "+" : ""}${stats.trends.weeklyTrend.toFixed(1)}% vs 7 hr lalu`
        : (stats.trends.dailyThisMonth > 0 ? `${stats.trends.dailyThisMonth} bln ini` : "Stabil"),
      trendTooltip: "Tren jumlah kegiatan 7 hari terakhir dibandingkan 7 hari sebelumnya",
      trendDelta: stats.trends.weeklyTrend,
      color: "var(--color-forest)",
      module: "daily",
      icon: <Calendar size={16} />,
    },
    {
      id: "stakeholder",
      label: "Stakeholder Engagement",
      value: stats.totals.stakeholder,
      unit: "sesi pertemuan",
      badge: "External Relations",
      trendText: (stats.trends.stakeholderTrend !== undefined && stats.trends.stakeholderTrend !== 0)
        ? `${stats.trends.stakeholderTrend > 0 ? "+" : ""}${stats.trends.stakeholderTrend.toFixed(1)}% vs bln lalu`
        : ((stats.trends.stakeholderThisMonth ?? 0) > 0 ? `${stats.trends.stakeholderThisMonth} sesi bln ini` : "Stabil"),
      trendTooltip: "Perubahan jumlah sesi pertemuan stakeholder bulan ini dibandingkan bulan lalu",
      trendDelta: stats.trends.stakeholderTrend || 0,
      color: "var(--color-ochre)",
      module: "stakeholder",
      icon: <Users size={16} />,
    },
    {
      id: "grievance",
      label: "Grievance",
      value: stats.totals.grievance,
      unit: "tiket pengaduan",
      badge: `${resolutionRate}% terselesaikan`,
      badgeColor: resolutionRate >= 80 ? "bg-forest/10 text-forest" : "bg-ochre/15 text-ochre",
      trendText: stats.actionable.untouchedGrievances > 0 
        ? `${stats.actionable.untouchedGrievances} perlu respon`
        : undefined,
      trendTooltip: "Jumlah tiket keluhan prioritas tinggi yang memerlukan tindak lanjut segera",
      trendDelta: stats.actionable.untouchedGrievances > 0 ? -1 : 0,
      isIssue: true,
      color: "var(--color-clay)",
      module: "grievance",
      icon: <MessageSquareWarning size={16} />,
    },
    {
      id: "csr",
      label: "CSR Projects",
      value: stats.totals.csr,
      unit: "program kerja",
      badge: totalBudget > 0 ? formatIDRCompact(totalBudget) : "Program CSR",
      badgeColor: "bg-forest/10 text-forest",
      trendText: `${stats.actionable.csrOnGoing} On Going`,
      trendTooltip: "Jumlah program CSR yang sedang aktif berjalan di lapangan",
      trendDelta: 0,
      color: "var(--color-forest-2)",
      module: "csr",
      icon: <Leaf size={16} />,
    },
  ];

  const secondaryKpis = [
    { 
      label: "Top Issues", 
      value: stats.totals.issues, 
      unit: "isu strategis",
      module: "topissues", 
      icon: <AlertTriangle size={15} /> 
    },
    { 
      label: "Proposals", 
      value: stats.totals.proposals, 
      unit: `${acceptanceRate}% disetujui`,
      module: "proposals", 
      icon: <FileText size={15} /> 
    },
    { 
      label: "Livelihood Restoration (LRP)", 
      value: stats.totals.lrp, 
      unit: "program pemulihan",
      module: "lrp", 
      icon: <TreePine size={15} /> 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold tracking-tight text-ink">Ringkasan 7 Modul CSRM</h2>
            {stats.filters?.targetYear && (
              <span className="font-mono text-[11px] font-semibold bg-forest/10 text-forest px-2 py-0.5 rounded-md">
                Tahun {stats.filters.targetYear}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate mt-0.5">
            Monitoring komprehensif metrik operasional, tren bulanan kegiatan, resolusi keluhan, dan realisasi program CSR
          </p>
        </div>
        <button
          onClick={() => setShowImportWizard(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-forest hover:bg-forest-2 text-white rounded-xl text-[13px] font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <UploadCloud size={15} /> Import Master Excel
        </button>
      </div>

      {/* Alert Banner for Urgent Action Items */}
      {stats.actionable.untouchedGrievances > 0 && (
        <div className="bg-clay/10 border border-clay/20 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 text-[13px] text-clay font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              Terdapat <strong>{stats.actionable.untouchedGrievances}</strong> tiket <strong>Grievance</strong> prioritas tinggi yang memerlukan tindakan atau investigasi segera.
            </span>
          </div>
          <button
            onClick={() => onNav("grievance")}
            className="text-[12px] font-semibold text-clay hover:underline whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
          >
            Buka Modul Grievance <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards (Top 4 Modules) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => {
            const isPositive = k.trendDelta > 0;
            const isNegative = k.trendDelta < 0;
            const isGood = k.isIssue ? !isPositive : isPositive;

            return (
              <button
                key={k.id}
                onClick={() => onNav(k.module)}
                className="group rounded-2xl border border-line bg-white p-5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-paper-2 text-ink group-hover:bg-forest/10 group-hover:text-forest transition-colors">
                        {k.icon}
                      </span>
                      <span className="text-[13px] leading-tight text-ink font-semibold">{k.label}</span>
                    </div>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: k.color }} />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-ink">{k.value}</span>
                    <span className="text-[12px] text-slate">{k.unit}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2 text-xs flex-wrap">
                  {k.badge ? (
                    <span className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded-md ${k.badgeColor || "bg-paper-2 text-slate"}`}>
                      {k.badge}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-2">7 Modul CSRM</span>
                  )}

                  {k.trendText && (
                    <span
                      title={k.trendTooltip}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
                        k.trendDelta !== 0
                          ? isGood 
                            ? "bg-forest/10 text-forest" 
                            : "bg-clay/10 text-clay"
                          : "bg-paper-2 text-slate"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight size={12} className="shrink-0" />
                      ) : isNegative ? (
                        <ArrowDownRight size={12} className="shrink-0" />
                      ) : null}
                      <span>{k.trendText}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Informative Trend Micro-Guide */}
        <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-slate font-medium">
          <Activity size={12} className="text-forest shrink-0" />
          <span>
            <strong>Panduan Indikator:</strong> Tag tren (<span className="text-forest font-semibold">↑ Hijau</span> / <span className="text-clay font-semibold">↓ Merah</span>) menunjukkan pertumbuhan frekuensi kegiatan mingguan (Daily) &amp; bulanan (Stakeholder) terhadap periode sebelumnya.
          </span>
        </div>
      </div>

      {/* Secondary KPI Bar (Top Issues, Proposals, LRP) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {secondaryKpis.map((item) => (
          <button
            key={item.label}
            onClick={() => onNav(item.module)}
            className="flex items-center justify-between px-4 py-3.5 bg-white rounded-2xl border border-line hover:bg-paper/50 hover:shadow-2xs transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-forest/10 text-forest group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-ink">{item.label}</div>
                <div className="text-[11px] text-slate font-mono">{item.unit}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-ink">{item.value}</span>
              <ChevronRight size={15} className="text-slate-2 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Visual Analytics 1: 12-Month Timeline & PIC Distribution */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Left: 12-Month Operational Timeline Area Chart */}
        <section className="rounded-2xl border border-line bg-white p-5 xl:col-span-3 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Tren Aktivitas Operasional (Jan – Des)</h3>
              </div>
              <p className="text-[12px] text-slate mt-0.5">
                Volume kegiatan lapangan (Daily Activities) vs interaksi pemangku kepentingan (Stakeholder Engagement)
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-forest font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-forest inline-block" /> Daily Activities
              </span>
              <span className="flex items-center gap-1.5 text-ochre font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-ochre inline-block" /> Stakeholder
              </span>
            </div>
          </div>

          <div className="h-64">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6B4F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F6B4F" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorStakeholder" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C47F2A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C47F2A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-line bg-white p-3 shadow-lg text-xs space-y-1">
                            <div className="font-semibold text-ink border-b border-line pb-1 mb-1">
                              Bulan {label}
                            </div>
                            <div className="text-forest flex justify-between gap-4 font-mono font-medium">
                              <span>Daily Activities:</span>
                              <span>{payload[0]?.value || 0}</span>
                            </div>
                            <div className="text-ochre flex justify-between gap-4 font-mono font-medium">
                              <span>Stakeholder Engagement:</span>
                              <span>{payload[1]?.value || 0}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="daily"
                    name="Daily Activities"
                    stroke="#2F6B4F"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDaily)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stakeholder"
                    name="Stakeholder Engagement"
                    stroke="#C47F2A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorStakeholder)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate">
                Belum ada data rekaman aktivitas tahun ini
              </div>
            )}
          </div>
        </section>

        {/* Right: Team / PIC Workload Distribution */}
        <section className="rounded-2xl border border-line bg-white p-5 xl:col-span-2 shadow-2xs flex flex-col justify-between">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Distribusi Tim &amp; PIC</h3>
              </div>
              <p className="text-[12px] text-slate mt-0.5">Beban kegiatan lapangan per personil CSR</p>
            </div>
            <button
              onClick={() => onNav("daily")}
              className="text-[11px] font-semibold text-forest hover:underline cursor-pointer"
            >
              Lihat Detail →
            </button>
          </div>

          <div className="h-64 flex flex-col justify-center">
            {picData.length > 0 ? (
              <div className="space-y-3.5 overflow-y-auto pr-1">
                {picData.map((p, idx) => {
                  const maxVal = Math.max(...picData.map((d) => d.value), 1);
                  const pct = Math.round((p.value / maxVal) * 100);
                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex justify-between text-[12px]">
                        <span className="font-medium text-ink truncate">{p.name}</span>
                        <span className="font-mono text-slate font-semibold">{p.value} kegiatan</span>
                      </div>
                      <div className="h-2 w-full bg-paper-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PALETTE[idx % PALETTE.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate">
                Belum ada data penugasan PIC
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Visual Analytics 2: Sub-Category, Proposals, & Grievance Governance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Sub-Category Distribution */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Kategori Daily Activities</h3>
              </div>
              <p className="text-[12px] text-slate">Distribusi sub-kategori kegiatan operasional</p>
            </div>
            <button
              onClick={() => onNav("daily")}
              className="text-[11px] font-semibold text-forest hover:underline cursor-pointer"
            >
              Detail →
            </button>
          </div>

          <div className="h-56">
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData.slice(0, 7)} margin={{ top: 8, right: 8, left: -20, bottom: 28 }}>
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={40}
                    tick={({ x, y, payload }: any) => {
                      const raw = String(payload?.value ?? "");
                      const formatted = raw.length > 11 ? `${raw.slice(0, 9)}…` : raw;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={10}
                            textAnchor="end"
                            fill="#6F6A5C"
                            fontSize={10}
                            fontFamily="JetBrains Mono, monospace"
                            transform="rotate(-30)"
                          >
                            {formatted}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(47, 107, 79, 0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-md">
                            <div className="text-[12px] font-semibold text-ink">{item.payload?.name}</div>
                            <div className="mt-0.5 font-mono text-[11px] font-semibold text-forest">
                              {item.value} kegiatan
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                    {catData.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate">
                Belum ada data kategori
              </div>
            )}
          </div>
        </section>

        {/* Grievance Governance & Resolution Rate */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={16} className="text-clay" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Grievance Governance</h3>
              </div>
              <p className="text-[12px] text-slate">Tingkat resolusi &amp; status pengaduan</p>
            </div>
            <button
              onClick={() => onNav("grievance")}
              className="text-[11px] font-semibold text-clay hover:underline cursor-pointer"
            >
              Kelola →
            </button>
          </div>

          <div className="space-y-4 my-auto">
            {/* Resolution Rate Card */}
            <div className="rounded-xl bg-paper/60 border border-line p-3.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-forest" /> Resolution Rate
                </span>
                <span className="font-mono text-sm font-bold text-forest">{resolutionRate}%</span>
              </div>
              <div className="h-2 w-full bg-paper-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-forest rounded-full transition-all duration-500"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate font-mono">
                <span>{stats.actionable.grievanceClosed ?? 0} Selesai</span>
                <span>{stats.actionable.grievanceOnProgress ?? 0} On Progress</span>
                <span className="text-clay font-semibold">{stats.actionable.grievanceOpen ?? 0} Terbuka</span>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl border border-line bg-white p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate">Prioritas Tinggi</div>
                <div className="text-base font-bold font-mono text-clay mt-0.5">
                  {stats.actionable.grievanceHighOpen ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-white p-2.5">
                <div className="text-[10px] font-mono uppercase text-slate">Total Pengaduan</div>
                <div className="text-base font-bold font-mono text-ink mt-0.5">
                  {stats.totals.grievance}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proposals Pipeline & Status */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Status Proposals</h3>
              </div>
              <p className="text-[12px] text-slate">Komposisi evaluasi pengajuan proposal</p>
            </div>
            <button
              onClick={() => onNav("proposals")}
              className="text-[11px] font-semibold text-forest hover:underline cursor-pointer"
            >
              Buka →
            </button>
          </div>

          <div className="h-56">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 12,
                      border: "1px solid var(--color-line)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate">
                Belum ada data proposal
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Live Feeds & Operations Section (3 Columns) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Column 1: Daily Activities Terbaru */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Daily Activities Terbaru</h3>
              </div>
              <button
                onClick={() => onNav("daily")}
                className="text-[11px] font-semibold text-forest hover:underline cursor-pointer"
              >
                Lihat Semua →
              </button>
            </div>

            <div className="divide-y divide-line/60">
              {stats.recent.activities.length > 0 ? (
                stats.recent.activities.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-2.5 flex items-start gap-2.5 hover:bg-paper/40 transition-colors rounded-lg px-1">
                    <div className="w-6 h-6 rounded-lg bg-forest/10 text-forest flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-ink truncate">{a.activity}</div>
                      <div className="text-[11px] text-slate font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{formatDate(a.activity_date)}</span>
                        <span>·</span>
                        <span>{a.pic?.name || "Tim CSR"}</span>
                        {a.photoCount !== undefined && a.photoCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-forest font-semibold ml-auto">
                            <ImageIcon size={10} /> {a.photoCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[12px] text-slate">Belum ada Daily Activities terbaru</div>
              )}
            </div>
          </div>
        </section>

        {/* Column 2: CSR Projects (On Going & Budget Realization) */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <Leaf size={16} className="text-forest" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">CSR Projects (On Going)</h3>
              </div>
              <button
                onClick={() => onNav("csr")}
                className="text-[11px] font-semibold text-forest hover:underline cursor-pointer"
              >
                Lihat Proyek →
              </button>
            </div>

            {stats.recent.onGoingCsr.length > 0 ? (
              <div className="space-y-3.5">
                {stats.recent.onGoingCsr.slice(0, 4).map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between items-start text-[12px]">
                      <span className="text-ink truncate font-medium flex-1 mr-2">{c.program}</span>
                      <span className="font-mono text-slate font-semibold shrink-0">{formatIDR(c.budget)}</span>
                    </div>
                    {c.location && (
                      <div className="text-[10px] text-slate-2 font-mono truncate">{c.location}</div>
                    )}
                    <div className="h-1.5 bg-paper-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-forest rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              12,
                              ((c.budget || 0) / Math.max(...stats.recent.onGoingCsr.map((x) => x.budget || 0), 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-slate">Tidak ada CSR Projects berjalan</div>
            )}
          </div>
        </section>

        {/* Column 3: Top Issues & Strategic Risk */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-ochre" />
                <h3 className="text-[14px] font-bold tracking-tight text-ink">Top Issues &amp; Isu Strategis</h3>
              </div>
              <button
                onClick={() => onNav("topissues")}
                className="text-[11px] font-semibold text-ochre hover:underline cursor-pointer"
              >
                Pantau Isu →
              </button>
            </div>

            {stats.recent.topIssues && stats.recent.topIssues.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recent.topIssues.slice(0, 3).map((issue) => (
                  <div key={issue.id} className="p-2.5 rounded-xl bg-ochre/5 border border-ochre/20 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[10px] font-semibold text-ochre uppercase">
                        {issue.period?.includes(String(issue.year)) ? issue.period : `${issue.period} (${issue.year})`}
                      </span>
                    </div>
                    <div className="font-semibold text-ink line-clamp-1">{issue.issue}</div>
                    {issue.follow_up && (
                      <div className="text-[11px] text-slate mt-1 line-clamp-1">
                        Mitigasi: {issue.follow_up}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-slate">Tidak ada isu strategis aktif</div>
            )}
          </div>
        </section>
      </div>

      {showImportWizard && (
        <ImportWizardModal
          onClose={() => setShowImportWizard(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
