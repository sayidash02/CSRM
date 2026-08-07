import { apiClient } from "../lib/apiClient";
import { useState, useCallback, useEffect } from "react";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, Calendar, Users, AlertTriangle, FileText,
  Leaf, MessageSquareWarning, TreePine, RefreshCw, Upload,
  X, Check, Bell, Archive,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = "dashboard" | "daily" | "stakeholder" | "topissues" | "proposals" | "csr" | "grievance" | "lrp" | "archive";
interface SyncLog { id: number; syncedAt: string; status: "SUCCESS" | "FAILED"; }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_SYNC: SyncLog[] = [
  { id: 1, syncedAt: "2026-07-24 14:32:15", status: "SUCCESS" },
  { id: 2, syncedAt: "2026-07-21 09:15:44", status: "SUCCESS" },
  { id: 3, syncedAt: "2026-07-18 16:08:22", status: "FAILED" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard" as Module, label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "daily" as Module, label: "Daily Activities", icon: <Calendar size={16} /> },
  { id: "stakeholder" as Module, label: "Stakeholder Engagement", icon: <Users size={16} /> },
  { id: "topissues" as Module, label: "Top Issues", icon: <AlertTriangle size={16} /> },
  { id: "proposals" as Module, label: "Proposals", icon: <FileText size={16} /> },
  { id: "csr" as Module, label: "CSR Projects", icon: <Leaf size={16} /> },
  { id: "grievance" as Module, label: "Grievance", icon: <MessageSquareWarning size={16} /> },
  { id: "lrp" as Module, label: "LRP", icon: <TreePine size={16} /> },
  { id: "archive" as Module, label: "Pengaturan Arsip", icon: <Archive size={16} /> },
];

function Sidebar({ active, onNav, counts, unsyncedCount, onSync }: {
  active: Module; onNav: (m: Module) => void; counts: Record<string, number>; unsyncedCount: number; onSync: () => void;
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
        {NAV_ITEMS.map(item => {
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
        {unsyncedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Bell size={12} className="text-amber-400 shrink-0" />
            <span className="text-amber-300 text-[11px] font-mono">{unsyncedCount} data belum di-sync</span>
          </div>
        )}
        <button onClick={onSync} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          <Upload size={14} />Export &amp; Sync
        </button>
        <div className="mt-3 px-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-[#3D5070]">Ziya Ramadhani · CRS Dept</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Sync Modal ───────────────────────────────────────────────────────────────

type SyncState = "confirm" | "loading" | "success" | "error";
const SHEETS = ["Daily Activities","Stakeholder Engagement","Top Issues","Proposals","CSR Projects","Grievance","LRP"];

function SyncModal({ onClose, totalUnsynced, onSuccess, activeYear }: { onClose: () => void; totalUnsynced: number; onSuccess: () => void; activeYear: string }) {
  const [state, setState] = useState<SyncState>("confirm");
  const [progress, setProgress] = useState(0);

  const handleStart = useCallback(async () => {
    setState("loading");
    setProgress(10);
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 500);
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.post('/sync', { year });
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { setState("success"); onSuccess(); }, 500);
    } catch (e) {
      clearInterval(interval);
      setState("error");
    }
  }, [onSuccess, activeYear]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={state === "loading" ? undefined : onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Export &amp; Sync ke SharePoint</h2>
          {state !== "loading" && <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={15} /></button>}
        </div>

        {state === "confirm" && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">Generate ulang <strong className="text-foreground">1 file Excel (7 sheet)</strong> dari seluruh data database, lalu upload ke SharePoint master.{totalUnsynced > 0 && <> Terdapat <span className="text-amber-600 font-semibold">{totalUnsynced} data belum tersync.</span></>}</p>
            <div className="bg-muted rounded-lg p-3 grid grid-cols-2 gap-1.5">
              {SHEETS.map(m => <div key={m} className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{m}</div>)}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
              <button onClick={handleStart} className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"><Upload size={13} />Mulai Export &amp; Sync</button>
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-blue-100 border-t-blue-500 animate-spin shrink-0" style={{ borderWidth: 3, borderStyle: "solid" }} />
              <div><div className="text-sm font-medium text-foreground">Sedang memproses…</div><div className="text-xs text-muted-foreground font-mono mt-0.5">Berkomunikasi dengan server</div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-mono"><span>Progress</span><span>{progress}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="space-y-1.5">
              {SHEETS.map((s) => {
                const done = progress === 100;
                const active = progress > 0 && progress < 100;
                return (
                  <div key={s} className={`flex items-center gap-2 text-xs transition-colors ${done ? "text-emerald-600" : active ? "text-blue-600" : "text-muted-foreground"}`}>
                    {done ? <Check size={11} /> : active ? <RefreshCw size={11} className="animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full border border-current opacity-30" />}
                    {s}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Jangan tutup halaman ini.</p>
          </div>
        )}

        {state === "success" && (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><Check size={22} className="text-emerald-600" /></div>
            <div className="text-sm font-semibold text-foreground">Sync Berhasil!</div>
            <p className="text-xs text-muted-foreground leading-relaxed">7 sheet berhasil di-generate dan diupload ke SharePoint. File master telah diperbarui.</p>
            <div className="bg-muted rounded-lg px-4 py-3 text-left space-y-1">
              <div className="text-xs font-medium text-muted-foreground">File tersimpan di</div>
              <div className="text-xs font-mono text-blue-600 break-all">02.06 Community Relations/Daily Activities/DailyActivities.xlsx</div>
              <div className="text-[10px] text-muted-foreground font-mono">{new Date().toLocaleString("id-ID")}</div>
            </div>
            <button onClick={onClose} className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors">Selesai</button>
          </div>
        )}

        {state === "error" && (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto"><X size={22} className="text-red-500" /></div>
            <div className="text-sm font-semibold text-red-700">Sync Gagal</div>
            <p className="text-xs text-muted-foreground">Tidak dapat terhubung ke SharePoint. Periksa koneksi atau hubungi tim IT.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Tutup</button>
              <button onClick={handleStart} className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"><RefreshCw size={13} />Coba Lagi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>("dashboard");
  const [activeYear, setActiveYear] = useState<string>(
    () => localStorage.getItem('crms_active_year') ?? String(new Date().getFullYear())
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showSync, setShowSync] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [_syncHistory, setSyncHistory] = useState<SyncLog[]>(SEED_SYNC);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const fetchSyncStatus = useCallback(() => {
    apiClient.get(`/sync/status?year=${activeYear}`).then(res => {
      setUnsyncedCount(res.data.data.unsynced_count);
      if (res.data.data.last_sync) {
        setSyncHistory(prev => {
          const l = res.data.data.last_sync;
          const dt = new Date(l.synced_at);
          const ts = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}:${String(dt.getSeconds()).padStart(2,"0")}`;
          if (!prev.find(x => x.id === Number(l.id))) {
            return [{ id: Number(l.id), syncedAt: ts, status: l.status }, ...prev];
          }
          return prev;
        });
      }
    }).catch((err) => {
      console.error(err);
      toast.error("Gagal memuat status sinkronisasi");
    });
  }, [activeYear]);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Fetch available years from API
  useEffect(() => {
    apiClient.get('/years')
      .then(res => setAvailableYears(res.data.data))
      .catch(() => setAvailableYears([new Date().getFullYear()]));
  }, [activeModule]);

  // Re-fetch sync status when active year changes
  useEffect(() => {
    fetchSyncStatus();
  }, [activeYear, fetchSyncStatus]);

  useEffect(() => {
    if (activeModule === "dashboard") {
      apiClient.get('/dashboard/stats')
        .then(res => setDashboardStats(res.data.data))
        .catch(err => console.error("Failed to load dashboard stats", err));
    }
  }, [activeModule]);

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast.info(msg);
  }, []);

  const handleExport = useCallback(async (label: string, payload?: any) => {
    showToast(`Mengekspor data ke Excel...`, "info");
    try {
      const res = await apiClient.post('/export/excel', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${payload?.sheetName || label}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`"${label}.xlsx" berhasil diunduh`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengekspor data", "error");
    }
  }, [showToast]);

  const handleSyncSuccess = useCallback(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

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
      <Sidebar active={activeModule} onNav={setActiveModule} counts={counts} unsyncedCount={unsyncedCount} onSync={() => setShowSync(true)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-2 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              CRMS {NAV_ITEMS.find((n) => n.id === activeModule)?.label}
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
      </main>
      {showSync && <SyncModal onClose={() => setShowSync(false)} totalUnsynced={unsyncedCount} onSuccess={handleSyncSuccess} activeYear={activeYear} />}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
