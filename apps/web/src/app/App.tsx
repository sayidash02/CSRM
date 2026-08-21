import { apiClient } from "../lib/apiClient";
import { useState, useCallback, useEffect } from "react";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, Calendar, Users, AlertTriangle, FileText,
  Leaf, MessageSquareWarning, TreePine, Download, Archive, UserCog,
} from "lucide-react";
import DailyActivitiesModule from "../features/daily-activities/DailyActivitiesModule";
import StakeholdersModule from "../features/stakeholders/StakeholdersModule";
import TopIssuesModule from "../features/top-issues/TopIssuesModule";
import ProposalsModule from "../features/proposals/ProposalsModule";
import CsrProjectsModule from "../features/csr-projects/CsrProjectsModule";
import GrievanceModule from "../features/grievance/GrievanceModule";
import LrpModule from "../features/lrp/LrpModule";
import DashboardModule, { DashboardStats } from "../features/dashboard/DashboardModule";
import ArchiveSettings from "../features/archive/ArchiveSettings";
import AdminUsersModule from "../features/admin/AdminUsersModule";
import { AuthGate, useAuth } from "../components/AuthGate";

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = "dashboard" | "daily" | "stakeholder" | "topissues" | "proposals" | "csr" | "grievance" | "lrp" | "archive" | "admin-users";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ id: Module; label: string; icon: React.ReactNode; adminOnly?: boolean }> = [
  { id: "dashboard" as Module, label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "daily" as Module, label: "Daily Activities", icon: <Calendar size={16} /> },
  { id: "stakeholder" as Module, label: "Stakeholder Engagement", icon: <Users size={16} /> },
  { id: "topissues" as Module, label: "Top Issues", icon: <AlertTriangle size={16} /> },
  { id: "proposals" as Module, label: "Proposals", icon: <FileText size={16} /> },
  { id: "csr" as Module, label: "CSR Projects", icon: <Leaf size={16} /> },
  { id: "grievance" as Module, label: "Grievance", icon: <MessageSquareWarning size={16} /> },
  { id: "lrp" as Module, label: "LRP", icon: <TreePine size={16} /> },
  { id: "archive" as Module, label: "Pengaturan Arsip", icon: <Archive size={16} /> },
  { id: "admin-users" as Module, label: "Kelola Akun", icon: <UserCog size={16} />, adminOnly: true },
];

function Sidebar({ active, onNav, counts, onExport, items, username, role }: {
  active: Module; onNav: (m: Module) => void; counts: Record<string, number>; onExport: () => void; items: typeof NAV_ITEMS; username: string; role: string;
}) {
  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-[#0F1729] text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0"><span className="text-white text-xs font-bold font-mono">CR</span></div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">CRMS</div>
            <div className="text-[#5B6585] text-[10px] font-mono uppercase tracking-widest mt-0.5">Community Relations</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="mb-1 px-3 py-1.5"><span className="text-[#3B5070] text-[10px] font-mono uppercase tracking-widest">Modules</span></div>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md mb-0.5 text-sm transition-all duration-150 group ${isActive ? "bg-[#1E2D4A] text-white" : "text-sidebar-foreground hover:bg-[#1A2438] hover:text-white"}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-[#3D5070] group-hover:text-blue-400"}`}>{item.icon}</span>
                <span className="text-[13px] truncate">{item.label}</span>
              </div>
              {counts[item.id] !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1 ${isActive ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-[#5B6585]"}`}>{counts[item.id]}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={onExport} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          <Download size={14} />Download Excel
        </button>
        <div className="mt-3 px-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate text-[10px] font-mono text-[#3D5070]">{username} · {role}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function CrmsWorkspace() {
  const { logout, user } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>("dashboard");
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'ADMIN');

  const [activeYear, setActiveYear] = useState<string>(
    () => localStorage.getItem('crms_active_year') ?? String(new Date().getFullYear())
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Fetch available years from API
  useEffect(() => {
    apiClient.get('/years')
      .then(res => setAvailableYears(res.data.data))
      .catch(() => setAvailableYears([new Date().getFullYear()]));
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === "dashboard") {
      const dashboardYear = activeYear || 'All';
      apiClient.get(`/dashboard/stats?year=${encodeURIComponent(dashboardYear)}`)
        .then(res => setDashboardStats(res.data.data))
        .catch(err => console.error("Failed to load dashboard stats", err));
    }
  }, [activeModule, activeYear]);

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast.info(msg);
  }, []);

  const handleExport = useCallback(async (label: string) => {
    showToast("Menyiapkan workbook Excel perusahaan...", "info");
    try {
      const year = activeYear || 'All';
      const res = await apiClient.get(`/export/workbook?year=${encodeURIComponent(year)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CRS-operational-${year === 'All' ? 'all-years' : year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Workbook Excel berhasil diunduh`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengekspor data", "error");
    }
  }, [activeYear, showToast]);

  const counts = dashboardStats?.totals ? {
    daily: dashboardStats.totals.daily,
    stakeholder: dashboardStats.totals.stakeholder,
    topissues: dashboardStats.totals.issues,
    proposals: dashboardStats.totals.proposals,
    csr: dashboardStats.totals.csr,
    grievance: dashboardStats.totals.grievance,
    lrp: dashboardStats.totals.lrp,
  } : { daily: 0, stakeholder: 0, topissues: 0, proposals: 0, csr: 0, grievance: 0, lrp: 0 };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar active={activeModule} onNav={setActiveModule} counts={counts} onExport={() => handleExport("Workbook CRMS")} items={visibleNavItems} username={user.username} role={user.role} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-2 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              CRMS {visibleNavItems.find((n) => n.id === activeModule)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="header-year-select" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar size={13} />
              Tahun:
            </label>
            <select
              id="header-year-select"
              value={activeYear}
              onChange={(e) => {
                const y = e.target.value;
                setActiveYear(y);
                localStorage.setItem('crms_active_year', y);
              }}
              className="px-2.5 py-1 text-xs bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring font-mono font-semibold text-foreground"
            >
              <option value="">Semua</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Keluar
            </button>
          </div>
        </header>

        {activeModule === "dashboard" && <DashboardModule stats={dashboardStats} onNav={setActiveModule} />}
        {activeModule === "daily" && <DailyActivitiesModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "stakeholder" && <StakeholdersModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "topissues" && <TopIssuesModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "proposals" && <ProposalsModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "csr" && <CsrProjectsModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "grievance" && <GrievanceModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "lrp" && <LrpModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />}
        {activeModule === "archive" && <ArchiveSettings />}
        {activeModule === "admin-users" && user.role === 'ADMIN' && <AdminUsersModule currentUsername={user.username} />}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default function App() {
  return <AuthGate><CrmsWorkspace /></AuthGate>;
}
