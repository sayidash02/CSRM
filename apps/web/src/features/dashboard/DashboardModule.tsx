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
  BarChart2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  UploadCloud,
  AlertCircle,
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
} from "recharts";
import { ImportWizardModal } from "../import/ImportWizardModal";

export interface DashboardStats {
  totals: {
    daily: number;
    stakeholder: number;
    issues: number;
    proposals: number;
    csr: number;
    grievance: number;
    lrp: number;
  };
  trends: {
    dailyThisMonth: number;
    dailyLastMonth: number;
    dailyTrend: number;
    weeklyThisWeek: number;
    weeklyLastWeek: number;
    weeklyTrend: number;
  };
  actionable: {
    csrOnGoing: number;
    grievanceHighOpen: number;
    untouchedGrievances: number;
  };
  charts: {
    dailyByCategory: Array<{ name: string; value: number }>;
    proposalsStatus: Array<{ name: string; value: number; color: string }>;
  };
  recent: {
    activities: Array<{
      id: string;
      activity: string;
      activity_date: string;
      pic?: { name: string } | null;
      sub_category?: { name: string } | null;
    }>;
    highPriorityGrievances: Array<{
      id: string;
      regNo: string;
      name: string;
      description: string;
      significance: string;
    }>;
    onGoingCsr: Array<{ id: string; program: string; budget: number }>;
  };
}

interface DashboardModuleProps {
  stats: DashboardStats | null;
  onNav: (module: any) => void;
}

const PALETTE = ["#2F6B4F", "#3D8A66", "#C47F2A", "#B4552F", "#6F6A5C", "#14201B", "#8A8577"];

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

function SignificanceBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Low: "bg-forest/10 text-forest",
    Medium: "bg-ochre/15 text-ochre",
    High: "bg-clay/15 text-clay",
    Critical: "bg-clay/25 text-clay font-bold",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono ${map[level] ?? "bg-slate/15 text-slate"}`}>
      {level}
    </span>
  );
}

export default function DashboardModule({ stats, onNav }: DashboardModuleProps) {
  const [showImportWizard, setShowImportWizard] = useState(false);

  const catData = useMemo(() => stats?.charts?.dailyByCategory || [], [stats]);
  const pieData = useMemo(() => (stats?.charts?.proposalsStatus || []).filter((d) => d.value > 0), [stats]);

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-slate">
          <div className="w-8 h-8 rounded-full border-2 border-forest/30 border-t-forest animate-spin" />
          <p className="text-[13px] font-medium">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      id: "daily",
      label: "Aktivitas Lapangan",
      value: stats.totals.daily,
      unit: "kegiatan",
      delta: stats.trends.weeklyTrend,
      color: "var(--color-forest)",
      module: "daily",
      icon: <Calendar size={16} />,
    },
    {
      id: "stakeholder",
      label: "Engagement Pemangku Kepentingan",
      value: stats.totals.stakeholder,
      unit: "sesi",
      delta: stats.trends.dailyTrend,
      color: "var(--color-ochre)",
      module: "stakeholder",
      icon: <Users size={16} />,
    },
    {
      id: "grievance",
      label: "Keluhan Terbuka",
      value: stats.totals.grievance,
      unit: "kasus",
      delta: stats.actionable.grievanceHighOpen > 0 ? stats.actionable.grievanceHighOpen : 0,
      isIssue: true,
      color: "var(--color-clay)",
      module: "grievance",
      icon: <MessageSquareWarning size={16} />,
    },
    {
      id: "csr",
      label: "Program CSR Aktif",
      value: stats.totals.csr,
      unit: `${stats.actionable.csrOnGoing} berjalan`,
      delta: 0,
      color: "var(--color-forest-2)",
      module: "csr",
      icon: <Leaf size={16} />,
    },
  ];

  const secondaryKpis = [
    { label: "Isu Dipantau", value: stats.totals.issues, module: "topissues", icon: <AlertTriangle size={15} /> },
    { label: "Proposal Masuk", value: stats.totals.proposals, module: "proposals", icon: <FileText size={15} /> },
    { label: "LRP Program", value: stats.totals.lrp, module: "lrp", icon: <TreePine size={15} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Ringkasan Operasional</h2>
          <p className="text-[12px] text-slate mt-0.5">Statistik dan aktivitas terkini program CSR & Community Relations</p>
        </div>
        <button
          onClick={() => setShowImportWizard(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-forest hover:bg-forest-2 text-white rounded-lg text-[13px] font-medium shadow-xs transition-colors"
        >
          <UploadCloud size={15} /> Import Master Excel
        </button>
      </div>

      {/* Alert Banner for Urgent Action Items */}
      {stats.actionable.untouchedGrievances > 0 && (
        <div className="bg-clay/10 border border-clay/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[13px] text-clay font-medium">
            <AlertCircle size={17} className="shrink-0" />
            <span>
              Terdapat <strong>{stats.actionable.untouchedGrievances}</strong> keluhan (grievance) prioritas tinggi yang perlu segera ditindaklanjuti.
            </span>
          </div>
          <button
            onClick={() => onNav("grievance")}
            className="text-[12px] font-semibold text-clay hover:underline whitespace-nowrap"
          >
            Buka Modul Grievance →
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const up = k.delta >= 0;
          const good = k.isIssue ? !up : up;

          return (
            <button
              key={k.id}
              onClick={() => onNav(k.module)}
              className="group rounded-xl border border-line bg-white p-4 text-left transition-all duration-200 hover:shadow-[0_1px_0_rgba(20,32,27,0.04),0_8px_24px_-12px_rgba(20,32,27,0.15)] hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] leading-snug text-slate font-medium">{k.label}</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: k.color }} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-ink">{k.value}</span>
                  <span className="text-[11px] text-slate-2">{k.unit}</span>
                </div>
                {k.delta !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      good ? "bg-forest/10 text-forest" : "bg-clay/10 text-clay"
                    }`}
                  >
                    {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(k.delta).toFixed(1)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary KPI Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {secondaryKpis.map((item) => (
          <button
            key={item.label}
            onClick={() => onNav(item.module)}
            className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-line hover:bg-paper/40 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-forest">{item.icon}</span>
              <span className="text-[13px] font-medium text-ink">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[15px] font-semibold text-ink">{item.value}</span>
              <ChevronRight size={14} className="text-slate-2" />
            </div>
          </button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Left: Bar chart by Sub Category */}
        <section className="rounded-xl border border-line bg-white p-5 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-ink">Aktivitas per Sub-Kategori</h3>
              <p className="text-[12px] text-slate">Distribusi jenis kegiatan operasional</p>
            </div>
            <button
              onClick={() => onNav("daily")}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-forest hover:text-forest-2"
            >
              Lihat Detail <ChevronRight size={13} />
            </button>
          </div>

          <div className="h-64">
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} margin={{ top: 8, right: 12, left: -20, bottom: 42 }}>
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={52}
                    tick={({ x, y, payload }: any) => {
                      const raw = String(payload?.value ?? "");
                      const formatted = raw.length > 14 ? `${raw.slice(0, 12)}…` : raw;
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
                            transform="rotate(-35)"
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
                          <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-md">
                            <div className="text-[12px] font-semibold text-ink">{item.payload?.name}</div>
                            <div className="mt-0.5 font-mono text-[11px] font-medium text-forest">
                              {item.value} kegiatan
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate">
                Belum ada data aktivitas tercatat
              </div>
            )}
          </div>
        </section>

        {/* Right: Pie Chart Proposals Status */}
        <section className="rounded-xl border border-line bg-white p-5 xl:col-span-2 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-ink">Status Proposal</h3>
              <p className="text-[12px] text-slate">Komposisi evaluasi proposal masuk</p>
            </div>
            <button
              onClick={() => onNav("proposals")}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-forest hover:text-forest-2"
            >
              Detail <ChevronRight size={13} />
            </button>
          </div>

          <div className="h-64 flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
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

      {/* Recent Activities & Actionable Section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Left: Kegiatan Terbaru Table */}
        <section className="rounded-xl border border-line bg-white xl:col-span-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Aktivitas Terbaru</h3>
            <button
              onClick={() => onNav("daily")}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-forest hover:text-forest-2"
            >
              Lihat semua <ChevronRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-line/60">
            {stats.recent.activities.length > 0 ? (
              stats.recent.activities.slice(0, 5).map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-paper/40 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-forest/10 text-forest flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink truncate">{a.activity}</div>
                    <div className="text-[11px] text-slate mt-0.5 font-mono">
                      {formatDate(a.activity_date)} · {a.pic?.name || "Tanpa PIC"}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-paper-2 text-slate rounded-full shrink-0">
                    {a.sub_category?.name || "Umum"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[13px] text-slate">Belum ada kegiatan terbaru</div>
            )}
          </div>
        </section>

        {/* Right: High-Priority Grievance & Ongoing CSR */}
        <div className="xl:col-span-2 space-y-4">
          {/* Grievance Card */}
          {stats.recent.highPriorityGrievances.length > 0 ? (
            stats.recent.highPriorityGrievances.slice(0, 2).map((g) => (
              <div key={g.id} className="bg-clay/5 border border-clay/20 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <MessageSquareWarning size={16} className="text-clay shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-mono text-clay font-semibold">{g.regNo}</span>
                      <SignificanceBadge level={g.significance} />
                    </div>
                    <div className="text-[13px] font-semibold text-ink truncate">{g.name}</div>
                    <div className="text-[12px] text-slate mt-0.5 line-clamp-2 leading-relaxed">{g.description}</div>
                    <button
                      onClick={() => onNav("grievance")}
                      className="mt-2 text-[11px] text-clay font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Tinjau Keluhan <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-forest/5 border border-forest/20 rounded-xl p-4 flex items-center gap-3">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-forest/15 text-forest shrink-0">
                <Check size={15} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-ink">Tidak ada grievance mendesak</div>
                <div className="text-[11px] text-slate mt-0.5">Semua keluhan saat ini dalam penanganan wajar.</div>
              </div>
            </div>
          )}

          {/* CSR Budget Card */}
          <section className="bg-white border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-slate uppercase tracking-wider font-mono">
                CSR Budget (On Going)
              </div>
              <button
                onClick={() => onNav("csr")}
                className="text-[11px] text-forest font-medium hover:underline"
              >
                Lihat Proyek →
              </button>
            </div>
            {stats.recent.onGoingCsr.length > 0 ? (
              stats.recent.onGoingCsr.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-ink truncate max-w-[170px] font-medium">{c.program}</span>
                    <span className="font-mono text-slate shrink-0 ml-2">{formatIDR(c.budget)}</span>
                  </div>
                  <div className="h-1.5 bg-paper-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest rounded-full"
                      style={{ width: `${Math.min(100, (c.budget / 500000000) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-slate py-2">Tidak ada program CSR berjalan</div>
            )}
          </section>
        </div>
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
