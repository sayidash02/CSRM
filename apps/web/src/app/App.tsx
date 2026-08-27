import { useMemo, useState, useCallback, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  Leaf,
  MessageSquareWarning,
  Sprout,
  Download,
  UserCog,
  ChevronRight,
  Menu,
  X,
  Search,
  User,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { apiClient } from "../lib/apiClient";
import { AuthGate, useAuth } from "../components/AuthGate";
import { OmnisearchModal } from "../components/OmnisearchModal";
import { UserProfileModal } from "../components/UserProfileModal";
import DailyActivitiesModule from "../features/daily-activities/DailyActivitiesModule";
import StakeholdersModule from "../features/stakeholders/StakeholdersModule";
import TopIssuesModule from "../features/top-issues/TopIssuesModule";
import ProposalsModule from "../features/proposals/ProposalsModule";
import CsrProjectsModule from "../features/csr-projects/CsrProjectsModule";
import GrievanceModule from "../features/grievance/GrievanceModule";
import LrpModule from "../features/lrp/LrpModule";
import DashboardModule, { DashboardStats } from "../features/dashboard/DashboardModule";
import AdminUsersModule from "../features/admin/AdminUsersModule";

// ─── Types & Navigation ──────────────────────────────────────────────────────

type Module =
  | "dashboard"
  | "daily"
  | "stakeholder"
  | "topissues"
  | "proposals"
  | "csr"
  | "grievance"
  | "lrp"
  | "admin-users";

interface NavItem {
  id: Module;
  label: string;
  short: string;
  icon: React.ReactNode;
  group: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", short: "OVERVIEW", icon: <LayoutDashboard size={15} />, group: "Ringkasan" },
  { id: "daily", label: "Daily Activities", short: "FIELD", icon: <Calendar size={15} />, group: "Operasional" },
  { id: "stakeholder", label: "Stakeholder Engagement", short: "ENGAGE", icon: <Users size={15} />, group: "Operasional" },
  { id: "topissues", label: "Top Issues", short: "ISSUES", icon: <AlertTriangle size={15} />, group: "Operasional" },
  { id: "grievance", label: "Grievance", short: "CASES", icon: <MessageSquareWarning size={15} />, group: "Operasional" },
  { id: "proposals", label: "Proposals", short: "DOCS", icon: <FileText size={15} />, group: "Program" },
  { id: "csr", label: "CSR Projects", short: "CSR", icon: <Leaf size={15} />, group: "Program" },
  { id: "lrp", label: "Livelihood Restoration", short: "LRP", icon: <Sprout size={15} />, group: "Program" },
  { id: "admin-users", label: "Kelola Akun", short: "ADMIN", icon: <UserCog size={15} />, group: "Sistem", adminOnly: true },
];

function getInitials(name: string): string {
  if (!name) return "CR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Sidebar Component ───────────────────────────────────────────────────────

function Sidebar({
  active,
  onNav,
  counts,
  onExport,
  items,
  username,
  role,
  onClose,
  onOpenProfile,
}: {
  active: Module;
  onNav: (m: Module) => void;
  counts: Record<string, number>;
  onExport: () => void;
  items: NavItem[];
  username: string;
  role: string;
  onClose?: () => void;
  onOpenProfile?: () => void;
}) {
  const groups = [...new Set(items.map((i) => i.group))];
  const initials = getInitials(username);

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col bg-ink text-paper/70 border-r border-white/[0.06]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-3 min-h-[72px] border-b border-white/[0.06]">
        <div className="rounded-lg bg-white p-1.5 shadow-sm shrink-0 flex items-center justify-center">
          <img
            src="/logo_jawasatupower.png"
            alt="PT Jawa Satu Power"
            className="h-6 w-auto max-w-[90px] object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold tracking-tight text-white leading-tight truncate">
            JAWA SATU POWER
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/50 truncate mt-0.5">
            Departemen CSR
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-paper/50 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links Grouped */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="mb-5">
              <div className="px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-paper/30">
                {group}
              </div>
              {groupItems.map((item) => {
                const on = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className={`group relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      on ? "bg-white/[0.07] text-white" : "hover:bg-white/[0.04] hover:text-white text-paper/70"
                    }`}
                  >
                    {on && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-forest-2" />
                    )}
                    <span className={on ? "text-forest-2" : "text-paper/40 group-hover:text-forest-2"}>
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate text-[12.5px] font-medium">{item.label}</span>
                    {counts[item.id] !== undefined && (
                      <span
                        className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded ${
                          on ? "bg-forest/30 text-white" : "bg-white/5 text-paper/40"
                        }`}
                      >
                        {counts[item.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer & Actions */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <button
          onClick={onExport}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-forest-2 shadow-sm cursor-pointer"
        >
          <Download size={15} /> Unduh Workbook Excel
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.07] transition-all text-left group cursor-pointer border border-transparent hover:border-white/10"
          title="Buka Profil Pengguna"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/30 border border-forest/40 font-mono text-[11px] text-emerald-300 font-semibold group-hover:bg-forest group-hover:text-white transition-colors shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] text-white font-medium group-hover:text-emerald-300 transition-colors">
              {username}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-paper/40 flex items-center gap-1.5 mt-0.5">
              <span>{role}</span>
              <span>·</span>
              <span className="text-forest-2 font-normal lowercase">profil</span>
            </div>
          </div>
          <ChevronRight size={13} className="text-paper/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// ─── Main Workspace ──────────────────────────────────────────────────────────

function CsrmWorkspace() {
  const { logout, user } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN"),
    [user.role]
  );

  const [activeYear, setActiveYear] = useState<string>(
    () => localStorage.getItem("csrm_active_year") ?? localStorage.getItem("crms_active_year") ?? String(new Date().getFullYear())
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const currentNavItem = useMemo(
    () => visibleNavItems.find((n) => n.id === activeModule) || visibleNavItems[0],
    [visibleNavItems, activeModule]
  );

  // Global keyboard shortcut for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch available years from API
  useEffect(() => {
    apiClient
      .get("/years")
      .then((res) => setAvailableYears(res.data.data))
      .catch(() => setAvailableYears([new Date().getFullYear()]));
  }, [activeModule]);

  // Fetch dashboard statistics
  useEffect(() => {
    if (activeModule === "dashboard") {
      const dashboardYear = activeYear || "All";
      apiClient
        .get(`/dashboard/stats?year=${encodeURIComponent(dashboardYear)}`)
        .then((res) => setDashboardStats(res.data.data))
        .catch((err) => console.error("Failed to load dashboard stats", err));
    }
  }, [activeModule, activeYear]);

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast.info(msg);
  }, []);

  const handleExport = useCallback(async () => {
    showToast("Menyiapkan workbook Excel perusahaan...", "info");
    try {
      const year = activeYear || "All";
      const res = await apiClient.get(`/export/workbook?year=${encodeURIComponent(year)}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `CRS-operational-${year === "All" ? "all-years" : year}.xlsx`);
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

  const counts: Record<string, number> = useMemo(() => {
    if (!dashboardStats?.totals) {
      return { daily: 0, stakeholder: 0, topissues: 0, proposals: 0, csr: 0, grievance: 0, lrp: 0 };
    }
    return {
      daily: dashboardStats.totals.daily,
      stakeholder: dashboardStats.totals.stakeholder,
      topissues: dashboardStats.totals.issues,
      proposals: dashboardStats.totals.proposals,
      csr: dashboardStats.totals.csr,
      grievance: dashboardStats.totals.grievance,
      lrp: dashboardStats.totals.lrp,
    };
  }, [dashboardStats]);

  const navigateTo = (m: Module) => {
    setActiveModule(m);
    setNavOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          active={activeModule}
          onNav={navigateTo}
          counts={counts}
          onExport={handleExport}
          items={visibleNavItems}
          username={user.username}
          role={user.role}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl z-50">
            <Sidebar
              active={activeModule}
              onNav={navigateTo}
              counts={counts}
              onExport={handleExport}
              items={visibleNavItems}
              username={user.username}
              role={user.role}
              onClose={() => setNavOpen(false)}
              onOpenProfile={() => {
                setNavOpen(false);
                setIsProfileOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/80 px-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setNavOpen(true)}
              className="-ml-1 rounded-lg p-1.5 text-slate hover:bg-paper-2 hover:text-ink lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-slate font-medium sm:inline">
              PT Jawa Satu Power · CRIMEs
            </span>
            <ChevronRight size={13} className="hidden text-slate-2 sm:inline" />
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {currentNavItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Universal Omnisearch Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper/60 hover:bg-white px-2.5 sm:px-3 py-1.5 text-[12px] text-slate hover:text-ink transition-all shadow-2xs cursor-pointer group"
              title="Pencarian Global (Ctrl + K)"
            >
              <Search size={14} className="text-forest group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline">Cari data...</span>
              <span className="inline md:hidden">Cari</span>
              <kbd className="hidden sm:inline-flex items-center rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-2 border border-line">
                ⌘K
              </kbd>
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 shadow-2xs">
              <Calendar size={13} className="text-slate-2" />
              <label htmlFor="header-year-select" className="sr-only">
                Pilih Tahun
              </label>
              <select
                id="header-year-select"
                value={activeYear}
                onChange={(e) => {
                  const y = e.target.value;
                  setActiveYear(y);
                  localStorage.setItem("csrm_active_year", y);
                }}
                className="bg-transparent font-mono text-[12px] font-medium text-ink outline-none cursor-pointer"
              >
                <option value="">Semua</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-line bg-white hover:bg-paper/60 px-2.5 py-1.5 text-[12px] text-ink transition-colors shadow-2xs cursor-pointer group"
              title="Lihat & Kelola Profil Saya"
            >
              <div className="grid h-5 w-5 place-items-center rounded-md bg-forest/20 font-mono text-[10px] text-forest font-bold group-hover:bg-forest group-hover:text-white transition-colors">
                {getInitials(user.username)}
              </div>
              <span className="hidden sm:inline font-medium capitalize max-w-[100px] truncate">{user.username}</span>
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-slate hover:bg-paper/60 hover:text-ink transition-colors shadow-2xs cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Dynamic Module Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper/60">
          {activeModule === "dashboard" && <DashboardModule stats={dashboardStats} onNav={setActiveModule} />}
          {activeModule === "daily" && (
            <DailyActivitiesModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "stakeholder" && (
            <StakeholdersModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "topissues" && (
            <TopIssuesModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "proposals" && (
            <ProposalsModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "csr" && (
            <CsrProjectsModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "grievance" && (
            <GrievanceModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "lrp" && (
            <LrpModule activeYear={activeYear} onExport={handleExport} showToast={showToast} />
          )}
          {activeModule === "admin-users" && user.role === "ADMIN" && (
            <AdminUsersModule currentUsername={user.username} />
          )}
        </div>
      </main>

      <OmnisearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(m) => navigateTo(m)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onLogout={logout}
        showToast={showToast}
      />

      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <CsrmWorkspace />
    </AuthGate>
  );
}
