import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Calendar, Users, AlertTriangle, FileText,
  Leaf, MessageSquareWarning, TreePine, RefreshCw, Upload,
  Search, Plus, ChevronDown, X, Check, Download, ExternalLink,
  Bell, ChevronRight, Trash2, Edit2, ArrowUpRight, Wifi, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import DailyActivitiesModule, { DailyActivity } from "../features/daily-activities/DailyActivitiesModule";

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = "dashboard" | "daily" | "stakeholder" | "topissues" | "proposals" | "csr" | "grievance" | "lrp";
interface Stakeholder { id: number; stakeholder: string; dateVenue: string; concern: string; docs: string | null; }
interface TopIssue { id: number; period: string; issue: string; description: string; followUp: string; mainDoc: string | null; supportDoc: string | null; nextPlan: string; }
interface Proposal { id: number; regNo: string; dateReceived: string; institution: string; address: string; proposalDescription: string; proposalFile: string | null; assessmentFile: string | null; status: string; }
interface CsrProject { id: number; year: number; program: string; activity: string; type: string; location: string; target: string; objective: string; status: string; budget: number; period: string; docs: string | null; }
interface Grievance { id: number; regNo: string; logDate: string; name: string; address: string; phone: string; category: string; significance: string; description: string; location: string; investigation: string; resolution: string | null; feedback: string | null; status: string; completionDate: string | null; supportFile: string | null; }
interface LrpProgram { id: number; program: string; link: string; }
interface SyncLog { id: number; syncedAt: string; status: "SUCCESS" | "FAILED"; }

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_DAILY: DailyActivity[] = [];

const SEED_STAKEHOLDERS: Stakeholder[] = [
  { id: 1, stakeholder: "Dinas Sosial Kab. Bogor", dateVenue: "14 Juli 2026 — Kantor Dinas Sosial Bogor", concern: "Koordinasi program CSR pendampingan UMKM", docs: "https://sharepoint/docs/stakeholder_dinsos.pdf" },
  { id: 2, stakeholder: "Kepala Desa Ciawi", dateVenue: "10 Juli 2026 — Balai Desa Ciawi", concern: "Pembahasan rencana pembangunan jembatan akses warga", docs: null },
  { id: 3, stakeholder: "PT. Mitra Berkah Abadi", dateVenue: "8 Juli 2026 — Kantor Pusat", concern: "Kerjasama distribusi bantuan sembako ke 3 desa terdampak", docs: "https://sharepoint/docs/stakeholder_mitra.pdf" },
  { id: 4, stakeholder: "BNPB Kab. Bogor", dateVenue: "3 Juli 2026 — Zoom Meeting", concern: "Koordinasi program pemulihan pasca-banjir Kec. Caringin", docs: "https://sharepoint/docs/stakeholder_bnpb.pdf" },
];

const SEED_ISSUES: TopIssue[] = [
  { id: 1, period: "Juli 2026 : Tanggal 14-18", issue: "Keluhan Debu Jalan Hauling", description: "Warga Desa Ciawi mengeluhkan debu berlebih dari jalan hauling yang mengganggu aktivitas sehari-hari dan kesehatan anak-anak sekolah.", followUp: "Koordinasi dengan tim operasional untuk penyiraman jalan 2x sehari", mainDoc: "https://sharepoint/docs/issue_debu.pdf", supportDoc: null, nextPlan: "Evaluasi frekuensi penyiraman dan tambah water sprayer" },
  { id: 2, period: "Juli 2026 : Tanggal 7-11", issue: "Permintaan Beasiswa Warga", description: "Beberapa keluarga sekitar perusahaan mengajukan permohonan beasiswa pendidikan tinggi untuk anak-anak mereka.", followUp: "Verifikasi data penerima manfaat, koordinasi dengan HR untuk kuota CSR", mainDoc: "https://sharepoint/docs/issue_beasiswa.pdf", supportDoc: "https://sharepoint/docs/issue_beasiswa_lampiran.xlsx", nextPlan: "Pengumuman penerima beasiswa minggu ke-3 Agustus 2026" },
  { id: 3, period: "Juni 2026 : Tanggal 22-26", issue: "Kerusakan Jalan Akses Desa Cibadak", description: "Jalan utama akses desa rusak parah akibat lalu-lintas kendaraan berat proyek.", followUp: "Survey kondisi jalan dilakukan bersama tim sipil perusahaan", mainDoc: null, supportDoc: null, nextPlan: "Perbaikan dijadwalkan Agustus 2026 setelah anggaran disetujui" },
];

const SEED_PROPOSALS: Proposal[] = [
  { id: 1, regNo: "PRP-2026-0021", dateReceived: "2026-07-20", institution: "Karang Taruna Desa Leuwisadeng", address: "Jl. Raya Leuwisadeng No. 12, Bogor", proposalDescription: "Pengajuan bantuan peralatan olahraga dan renovasi lapangan voli", proposalFile: "https://sharepoint/proposals/PRP-2026-0021.pdf", assessmentFile: null, status: "Under Review" },
  { id: 2, regNo: "PRP-2026-0020", dateReceived: "2026-07-15", institution: "Pesantren Al-Hidayah Cibadak", address: "Kp. Cibadak RT 02/04, Bogor", proposalDescription: "Permohonan bantuan sarana pembelajaran dan perpustakaan mini", proposalFile: "https://sharepoint/proposals/PRP-2026-0020.pdf", assessmentFile: "https://sharepoint/assessment/PRP-2026-0020.pdf", status: "Approved" },
  { id: 3, regNo: "PRP-2026-0019", dateReceived: "2026-07-08", institution: "Kelompok Tani Maju Bersama", address: "Desa Ciasmara, Kec. Pamijahan, Bogor", proposalDescription: "Bantuan bibit unggul dan pupuk organik untuk 40 KK petani sekitar perusahaan", proposalFile: "https://sharepoint/proposals/PRP-2026-0019.pdf", assessmentFile: "https://sharepoint/assessment/PRP-2026-0019.pdf", status: "Declined" },
  { id: 4, regNo: "PRP-2026-0018", dateReceived: "2026-06-30", institution: "Posyandu Melati Desa Ciawi", address: "RT 04/03, Desa Ciawi, Kec. Ciawi", proposalDescription: "Pengadaan peralatan posyandu dan suplemen gizi balita", proposalFile: "https://sharepoint/proposals/PRP-2026-0018.pdf", assessmentFile: "https://sharepoint/assessment/PRP-2026-0018.pdf", status: "Approved" },
];

const SEED_CSR: CsrProject[] = [
  { id: 1, year: 2026, program: "Program Air Bersih Komunitas", activity: "Pembangunan sumur bor & instalasi perpipaan", type: "Infrastruktur", location: "3 Desa Kec. Leuwisadeng", target: "1.200 KK", objective: "Menyediakan akses air bersih layak bagi warga sekitar operasional perusahaan", status: "On Going", budget: 285000000, period: "Jan – Sep 2026", docs: "https://sharepoint/csr/air_bersih_2026.pdf" },
  { id: 2, year: 2026, program: "Beasiswa Pendidikan CRS 2026", activity: "Seleksi & penyaluran beasiswa S1/D3", type: "Pendidikan", location: "Kab. Bogor", target: "25 mahasiswa", objective: "Mendukung pendidikan tinggi anak-anak keluarga prasejahtera sekitar perusahaan", status: "On Going", budget: 125000000, period: "Feb – Des 2026", docs: "https://sharepoint/csr/beasiswa_2026.pdf" },
  { id: 3, year: 2026, program: "Pelatihan UMKM Berbasis Digital", activity: "Workshop e-commerce & digital marketing", type: "Ekonomi", location: "Kantor CRS", target: "60 pelaku UMKM", objective: "Meningkatkan kapasitas usaha mikro warga melalui adopsi platform digital", status: "Completed", budget: 78000000, period: "Mar – Mei 2026", docs: "https://sharepoint/csr/umkm_digital_2026.pdf" },
  { id: 4, year: 2026, program: "Perbaikan Infrastruktur Jalan Desa", activity: "Pengaspalan & drainase jalan desa", type: "Infrastruktur", location: "Desa Cibadak & Ciasmara", target: "2 desa, ±3.500 warga", objective: "Memperbaiki akses jalan desa yang rusak akibat lalu-lintas operasional", status: "Planning", budget: 420000000, period: "Agt – Nov 2026", docs: null },
];

const SEED_GRIEVANCES: Grievance[] = [
  { id: 1, regNo: "GRV-2026-0008", logDate: "2026-07-22", name: "Bapak Suherman", address: "Kp. Cibeureum RT 03/02, Desa Ciawi", phone: "0812-4567-8901", category: "Lingkungan", significance: "High", description: "Getaran akibat aktivitas blasting berdampak pada retakan dinding rumah warga", location: "Desa Ciawi — Area perumahan dekat pit barat", investigation: "Tim HSE melakukan pengukuran ground vibration dan inspeksi visual rumah pada 23 Juli 2026", resolution: null, feedback: null, status: "On Progress", completionDate: null, supportFile: "https://sharepoint/grievance/GRV-2026-0008.pdf" },
  { id: 2, regNo: "GRV-2026-0007", logDate: "2026-07-10", name: "Ibu Ratna Dewi", address: "Jl. Merdeka No. 5, Desa Cibadak", phone: "0856-2345-6789", category: "Kebisingan", significance: "Medium", description: "Kebisingan dari genset operasional malam hari mengganggu istirahat warga", location: "Area pemukiman sekitar genset auxiliary", investigation: "Pengukuran kebisingan dilakukan pukul 22.00-23.00, hasil 68 dB (ambang 55 dB malam)", resolution: "Pemasangan peredam suara tambahan pada genset, relokasi jadwal maintenance ke siang hari", feedback: "Warga menyatakan kebisingan sudah berkurang signifikan", status: "Resolved", completionDate: "2026-07-20", supportFile: null },
  { id: 3, regNo: "GRV-2026-0006", logDate: "2026-06-18", name: "Kelompok Nelayan Danau Ciawi", address: "Kp. Nelayan, Desa Ciawi", phone: "0821-9876-5432", category: "Mata Pencaharian", significance: "High", description: "Penurunan hasil tangkapan ikan akibat sedimentasi danau yang diduga berasal dari aktivitas proyek", location: "Danau Ciawi, area selatan", investigation: "Pengambilan sampel air dan sedimen oleh tim lingkungan pada 20 Juni 2026", resolution: "Koordinasi dengan tim proyek untuk pemasangan sediment trap di outlet drainase area proyek", feedback: null, status: "On Progress", completionDate: null, supportFile: "https://sharepoint/grievance/GRV-2026-0006.pdf" },
  { id: 4, regNo: "GRV-2026-0005", logDate: "2026-05-30", name: "Ibu Sari Dewi", address: "Jl. Raya Ciawi No. 45, Bogor", phone: "0878-1122-3344", category: "Debu", significance: "Low", description: "Debu dari truk material mengotori jemuran dan rumah warga di sepanjang jalan utama", location: "Jl. Raya Ciawi km 3-5", investigation: "Observasi lapangan dan wawancara 5 warga terdampak", resolution: "Penyiraman jalan oleh water truck 3x sehari dan pemasangan terpal penutup muatan truk", feedback: "Warga puas dengan respons cepat perusahaan", status: "Resolved", completionDate: "2026-06-10", supportFile: null },
];

const SEED_LRP: LrpProgram[] = [
  { id: 1, program: "Pemulihan Lahan Pertanian Terdampak — Desa Ciasmara", link: "https://sharepoint/lrp/pemulihan_lahan_ciasmara/" },
  { id: 2, program: "Bantuan Modal Usaha Nelayan Danau Ciawi 2025–2026", link: "https://sharepoint/lrp/bantuan_modal_nelayan_ciawi/" },
  { id: 3, program: "Peternakan Kambing Komunal Desa Leuwisadeng", link: "https://sharepoint/lrp/ternak_kambing_leuwisadeng/" },
  { id: 4, program: "Pelatihan Budidaya Ikan Air Tawar — Komunitas Ciawi", link: "https://sharepoint/lrp/budidaya_ikan_ciawi/" },
];

const SEED_SYNC: SyncLog[] = [
  { id: 1, syncedAt: "2026-07-24 14:32:15", status: "SUCCESS" },
  { id: 2, syncedAt: "2026-07-21 09:15:44", status: "SUCCESS" },
  { id: 3, syncedAt: "2026-07-18 16:08:22", status: "FAILED" },
];

const PIC_LIST = ["Ziya Ramadhani", "Adji Pratama", "Ziya & Adji", "Fadhil Akbar", "Nisa Rahayu"];
const SUB_CATS = ["Donasi","Internal Meeting","Issue","Issue & Grievance","Kehumasan","Project CSR","Security","Support Project","Data Processing (Olah Data)"];
const CHART_COLORS = ["#1D4ED8","#0EA5E9","#10B981","#F59E0B","#8B5CF6","#EF4444","#64748B","#EC4899","#14B8A6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const nextId = (arr: { id: number }[]) => arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;

function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    q.trim() === "" ? items : items.filter(item => keys.some(k => String(item[k]).toLowerCase().includes(q.toLowerCase()))),
    [items, q]);
  return { q, setQ, filtered };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Going":"bg-blue-100 text-blue-700", Planning:"bg-slate-100 text-slate-600", Completed:"bg-emerald-100 text-emerald-700",
    Cancelled:"bg-red-100 text-red-600", Approved:"bg-emerald-100 text-emerald-700", "Under Review":"bg-amber-100 text-amber-700",
    Declined:"bg-red-100 text-red-600", Open:"bg-orange-100 text-orange-700", "On Progress":"bg-blue-100 text-blue-700",
    Resolved:"bg-emerald-100 text-emerald-700", Closed:"bg-slate-100 text-slate-500", SUCCESS:"bg-emerald-100 text-emerald-700", FAILED:"bg-red-100 text-red-600",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function SignificanceBadge({ level }: { level: string }) {
  const map: Record<string, string> = { Low:"bg-slate-100 text-slate-500", Medium:"bg-amber-100 text-amber-700", High:"bg-orange-100 text-orange-700", Critical:"bg-red-100 text-red-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[level] ?? ""}`}>{level}</span>;
}

const inputCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Modal({ title, onClose, children, size = "md" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${size === "lg" ? "max-w-3xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saveLabel = "Simpan", isEdit }: { onClose: () => void; onSave: () => void; saveLabel?: string; isEdit?: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
      <button onClick={onSave} className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${isEdit ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-blue-700"}`}>
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}{saveLabel}
      </button>
    </div>
  );
}

function DeleteConfirm({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={15} className="text-red-500" /></div>
          <div>
            <div className="text-sm font-semibold text-foreground">Hapus data?</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">"<span className="font-medium text-foreground">{label}</span>" akan dihapus (soft delete) dan tidak muncul di daftar.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1.5"><Trash2 size={12} />Hapus</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error" | "info"; onDismiss: () => void }) {
  const s = { success: "bg-emerald-50 border-emerald-200 text-emerald-800", error: "bg-red-50 border-red-200 text-red-800", info: "bg-blue-50 border-blue-200 text-blue-800" };
  const ic = { success: <Check size={14} className="text-emerald-600 shrink-0" />, error: <X size={14} className="text-red-500 shrink-0" />, info: <Download size={14} className="text-blue-600 shrink-0" /> };
  return (
    <div onClick={onDismiss} className={`fixed bottom-5 right-5 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium cursor-pointer ${s[type]}`}>
      {ic[type]}{message}
    </div>
  );
}

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

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, onExport, children }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExport?: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0 gap-3 flex-wrap">
      <div className="shrink-0">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {showSearch && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari…"
              className="pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-44 placeholder:text-muted-foreground" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"><Download size={13} />Export</button>
        {onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors"><Plus size={13} />{addLabel ?? "Tambah"}</button>}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onNav, daily, stakeholders, issues, proposals, csr, grievances, syncHistory }: {
  onNav: (m: Module) => void; daily: DailyActivity[]; stakeholders: Stakeholder[]; issues: TopIssue[];
  proposals: Proposal[]; csr: CsrProject[]; grievances: Grievance[]; syncHistory: SyncLog[];
}) {
  const stats = [
    { label: "Daily Activities", value: daily.length, sub: "kegiatan tercatat", icon: <Calendar size={16} />, color: "text-blue-600", bg: "bg-blue-50", module: "daily" as Module },
    { label: "Stakeholder Meetings", value: stakeholders.length, sub: "pertemuan", icon: <Users size={16} />, color: "text-violet-600", bg: "bg-violet-50", module: "stakeholder" as Module },
    { label: "Active Issues", value: issues.length, sub: "isu dipantau", icon: <AlertTriangle size={16} />, color: "text-amber-600", bg: "bg-amber-50", module: "topissues" as Module },
    { label: "Proposals", value: proposals.length, sub: `${proposals.filter(p => p.status === "Under Review").length} menunggu review`, icon: <FileText size={16} />, color: "text-teal-600", bg: "bg-teal-50", module: "proposals" as Module },
    { label: "CSR Projects", value: csr.length, sub: `${csr.filter(c => c.status === "On Going").length} sedang berjalan`, icon: <Leaf size={16} />, color: "text-emerald-600", bg: "bg-emerald-50", module: "csr" as Module },
    { label: "Grievance", value: grievances.length, sub: `${grievances.filter(g => g.status === "On Progress" || g.status === "Open").length} dalam proses`, icon: <MessageSquareWarning size={16} />, color: "text-red-600", bg: "bg-red-50", module: "grievance" as Module },
  ];
  const catData = useMemo(() => {
    const c: Record<string, number> = {};
    daily.forEach(d => { c[d.sub] = (c[d.sub] || 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [daily]);
  const pieData = useMemo(() => [
    { name: "Under Review", value: proposals.filter(p => p.status === "Under Review").length, color: "#F59E0B" },
    { name: "Approved", value: proposals.filter(p => p.status === "Approved").length, color: "#10B981" },
    { name: "Declined", value: proposals.filter(p => p.status === "Declined").length, color: "#EF4444" },
  ].filter(d => d.value > 0), [proposals]);
  const openHigh = grievances.filter(g => (g.significance === "High" || g.significance === "Critical") && g.status !== "Resolved" && g.status !== "Closed");
  const lastSync = syncHistory.find(s => s.status === "SUCCESS");

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => onNav(s.module)} className="bg-card rounded-xl p-4 border border-border text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono">{s.value}</div>
            <div className="text-xs font-medium text-foreground mt-0.5">{s.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2"><BarChart2 size={14} className="text-muted-foreground" /><h2 className="text-sm font-semibold">Aktivitas per Sub Category</h2></div>
            <button onClick={() => onNav("daily")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Lihat semua <ChevronRight size={12} /></button>
          </div>
          <div className="p-4" style={{ height: 200 }}>
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
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Status Proposals</h2>
              <button onClick={() => onNav("proposals")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Detail <ChevronRight size={12} /></button>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="42%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sync Log</h2>
              <Wifi size={12} className="text-emerald-500" />
            </div>
            <div className="px-5 py-3 space-y-2">
              {syncHistory.slice(0, 3).map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{s.syncedAt}</span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
            {lastSync && <div className="px-5 pb-3 text-[10px] text-muted-foreground font-mono">Terakhir berhasil: {lastSync.syncedAt}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Kegiatan Terbaru</h2>
            <button onClick={() => onNav("daily")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">Lihat semua <ChevronRight size={12} /></button>
          </div>
          <div className="divide-y divide-border">
            {daily.slice(0, 5).map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={13} className="text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.activity}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{formatDate(a.date)} · {a.pic}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">{a.sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {openHigh.length > 0 ? openHigh.slice(0, 2).map(g => (
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
          )) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <div><div className="text-sm font-semibold text-emerald-700">Tidak ada grievance prioritas tinggi</div><div className="text-xs text-emerald-600 mt-0.5">Semua isu aktif berstatus rendah.</div></div>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-mono">CSR Budget (On Going)</div>
            {csr.filter(c => c.status === "On Going").map(c => (
              <div key={c.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground truncate max-w-[140px]">{c.program}</span>
                  <span className="font-mono text-muted-foreground shrink-0 ml-2">{formatIDR(c.budget)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (c.budget / 500000000) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Daily Activities ─────────────────────────────────────────────────────────

// DailyActivitiesModule is extracted to features/daily-activities/DailyActivitiesModule.tsx

// ─── Stakeholder ──────────────────────────────────────────────────────────────

function StakeholderForm({ initial, onClose, onSave }: { initial?: Stakeholder; onClose: () => void; onSave: (d: Omit<Stakeholder, "id">) => void }) {
  const [f, setF] = useState({ stakeholder: initial?.stakeholder ?? "", dateVenue: initial?.dateVenue ?? "", concern: initial?.concern ?? "", docs: initial?.docs ?? "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.stakeholder) return; onSave({ ...f, docs: f.docs || null }); onClose(); };
  return (
    <Modal title={initial ? "Edit Stakeholder" : "Tambah Stakeholder Engagement"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Nama Stakeholder" required><input type="text" value={f.stakeholder} onChange={e => set("stakeholder", e.target.value)} placeholder="Nama institusi / individu" className={inputCls} /></Field>
        <Field label="Tanggal & Tempat" hint="Contoh: 14 Juli 2026 — Kantor Dinas Sosial Bogor"><input type="text" value={f.dateVenue} onChange={e => set("dateVenue", e.target.value)} placeholder="14 Juli 2026 — Kantor Dinas…" className={inputCls} /></Field>
        <Field label="Concern / Isu yang Dibahas"><textarea rows={3} value={f.concern} onChange={e => set("concern", e.target.value)} placeholder="Topik atau isu yang dibahas dalam pertemuan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Link Dokumen (SharePoint)"><input type="text" value={f.docs} onChange={e => set("docs", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan"} isEdit={!!initial} />
    </Modal>
  );
}

function StakeholderModule({ items, onAdd, onEdit, onDelete, onExport }: { items: Stakeholder[]; onAdd: (d: Omit<Stakeholder, "id">) => void; onEdit: (id: number, d: Omit<Stakeholder, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["stakeholder", "concern", "dateVenue"]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [toDelete, setToDelete] = useState<Stakeholder | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Stakeholder Engagement" subtitle="Rekaman pertemuan & komunikasi dengan pemangku kepentingan" showSearch searchValue={q} onSearch={setQ} addLabel="Tambah" onAdd={() => setShowForm(true)} onExport={() => onExport("Stakeholder Engagement")} />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No","Stakeholder","Date & Venue","Concern / Issue","Docs",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide last:w-16">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{s.stakeholder}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{s.dateVenue}</td>
                  <td className="px-4 py-3 text-sm text-foreground max-w-xs"><div className="line-clamp-2">{s.concern}</div></td>
                  <td className="px-4 py-3 text-center">{s.docs ? <span className="text-blue-600 cursor-pointer"><ExternalLink size={13} /></span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(s)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
                      <button onClick={() => setToDelete(s)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data.</div>}
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {filtered.length} dari {items.length} data</div>
      </div>
      {showForm && <StakeholderForm onClose={() => setShowForm(false)} onSave={onAdd} />}
      {editing && <StakeholderForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.stakeholder} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── Top Issues ───────────────────────────────────────────────────────────────

function TopIssueForm({ initial, onClose, onSave }: { initial?: TopIssue; onClose: () => void; onSave: (d: Omit<TopIssue, "id">) => void }) {
  const [f, setF] = useState({ period: initial?.period ?? "", issue: initial?.issue ?? "", description: initial?.description ?? "", followUp: initial?.followUp ?? "", nextPlan: initial?.nextPlan ?? "", mainDoc: initial?.mainDoc ?? "", supportDoc: initial?.supportDoc ?? "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.period || !f.issue) return; onSave({ ...f, mainDoc: f.mainDoc || null, supportDoc: f.supportDoc || null }); onClose(); };
  return (
    <Modal title={initial ? "Edit Isu" : "Tambah Top Issue"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Periode" required hint="Contoh: Juli 2026 : Tanggal 21-25"><input type="text" value={f.period} onChange={e => set("period", e.target.value)} placeholder="Juli 2026 : Tanggal 21-25" className={inputCls} /></Field>
        <Field label="Isu" required><input type="text" value={f.issue} onChange={e => set("issue", e.target.value)} placeholder="Judul / nama isu" className={inputCls} /></Field>
        <Field label="Deskripsi"><textarea rows={3} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Penjelasan detail isu" className={`${inputCls} resize-none`} /></Field>
        <Field label="Follow Up"><textarea rows={2} value={f.followUp} onChange={e => set("followUp", e.target.value)} placeholder="Tindakan yang sudah / sedang dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Next Plan"><textarea rows={2} value={f.nextPlan} onChange={e => set("nextPlan", e.target.value)} placeholder="Rencana tindak lanjut berikutnya" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Main Document (URL)"><input type="text" value={f.mainDoc} onChange={e => set("mainDoc", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
          <Field label="Supporting Document (URL)"><input type="text" value={f.supportDoc} onChange={e => set("supportDoc", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Isu"} isEdit={!!initial} />
    </Modal>
  );
}

function TopIssuesModule({ items, onAdd, onEdit, onDelete, onExport }: { items: TopIssue[]; onAdd: (d: Omit<TopIssue, "id">) => void; onEdit: (id: number, d: Omit<TopIssue, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["issue", "period", "description", "followUp"]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TopIssue | null>(null);
  const [toDelete, setToDelete] = useState<TopIssue | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Top Issues" subtitle="Isu prioritas yang sedang dipantau dan ditindaklanjuti" addLabel="Tambah Isu" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Top Issues")} />
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {filtered.map((issue, i) => (
          <div key={issue.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button onClick={() => setExpanded(expanded === issue.id ? null : issue.id)} className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5 mt-0.5 shrink-0">{i + 1}</span>
                <div><div className="text-sm font-semibold text-foreground">{issue.issue}</div><div className="text-xs text-muted-foreground font-mono mt-0.5">{issue.period}</div></div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button onClick={e => { e.stopPropagation(); setEditing(issue); }} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
                <button onClick={e => { e.stopPropagation(); setToDelete(issue); }} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                <ChevronDown size={15} className={`text-muted-foreground transition-transform ${expanded === issue.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {expanded === issue.id && (
              <div className="px-5 pb-5 pt-2 border-t border-border space-y-3">
                {[{ label: "Deskripsi", val: issue.description }, { label: "Follow Up", val: issue.followUp }, { label: "Next Plan", val: issue.nextPlan }].map(({ label, val }) => val && (
                  <div key={label}><div className="text-xs font-medium text-muted-foreground mb-1">{label}</div><p className="text-sm text-foreground leading-relaxed">{val}</p></div>
                ))}
                <div className="flex gap-2 pt-1">
                  {issue.mainDoc && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-100 bg-blue-50 rounded px-2.5 py-1 cursor-pointer"><FileText size={11} /> Main Doc</span>}
                  {issue.supportDoc && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-100 bg-blue-50 rounded px-2.5 py-1 cursor-pointer"><FileText size={11} /> Supporting Doc</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada isu yang cocok.</div>}
      </div>
      {showForm && <TopIssueForm onClose={() => setShowForm(false)} onSave={onAdd} />}
      {editing && <TopIssueForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.issue} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── Proposals ────────────────────────────────────────────────────────────────

function ProposalForm({ initial, onClose, onSave, nextRegNo }: { initial?: Proposal; onClose: () => void; onSave: (d: Omit<Proposal, "id">) => void; nextRegNo: string }) {
  const [f, setF] = useState({ regNo: initial?.regNo ?? nextRegNo, dateReceived: initial?.dateReceived ?? "", institution: initial?.institution ?? "", address: initial?.address ?? "", proposalDescription: initial?.proposalDescription ?? "", proposalFile: initial?.proposalFile ?? "", assessmentFile: initial?.assessmentFile ?? "", status: initial?.status ?? "Under Review" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.institution || !f.dateReceived) return; onSave({ ...f, proposalFile: f.proposalFile || null, assessmentFile: f.assessmentFile || null }); onClose(); };
  return (
    <Modal title={initial ? "Edit Proposal" : "Tambah Proposal"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Registrasi"><input type="text" value={f.regNo} readOnly className={`${inputCls} font-mono bg-muted cursor-default`} /></Field>
          <Field label="Tanggal Penerimaan" required><input type="date" value={f.dateReceived} onChange={e => set("dateReceived", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Institusi / Pemohon" required><input type="text" value={f.institution} onChange={e => set("institution", e.target.value)} placeholder="Nama institusi atau kelompok" className={inputCls} /></Field>
        <Field label="Alamat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat lengkap" className={inputCls} /></Field>
        <Field label="Keterangan Proposal"><textarea rows={3} value={f.proposalDescription} onChange={e => set("proposalDescription", e.target.value)} placeholder="Ringkasan isi proposal" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="File Proposal (URL)"><input type="text" value={f.proposalFile} onChange={e => set("proposalFile", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
          <Field label="File Assessment (URL)"><input type="text" value={f.assessmentFile} onChange={e => set("assessmentFile", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
        </div>
        <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Under Review</option><option>Approved</option><option>Declined</option></select></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Proposal"} isEdit={!!initial} />
    </Modal>
  );
}

function ProposalsModule({ items, onAdd, onEdit, onDelete, onExport }: { items: Proposal[]; onAdd: (d: Omit<Proposal, "id">) => void; onEdit: (id: number, d: Omit<Proposal, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["regNo", "institution", "address", "proposalDescription"]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [toDelete, setToDelete] = useState<Proposal | null>(null);
  const displayed = statusFilter === "All" ? filtered : filtered.filter(p => p.status === statusFilter);
  const nextRegNo = `PRP-2026-${String(items.length + 1).padStart(4, "0")}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Proposals" subtitle="Manajemen proposal masuk dari komunitas & mitra" addLabel="Tambah Proposal" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Proposals")}>
        <div className="flex gap-1">
          {["All","Under Review","Approved","Declined"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {s}{s !== "All" && <span className="ml-1 font-mono">{items.filter(p => p.status === s).length}</span>}
            </button>
          ))}
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No. Reg","Tgl Terima","Institusi","Keterangan","Status","Files",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide last:w-16">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.regNo}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(p.dateReceived)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground"><div className="truncate max-w-[150px]">{p.institution}</div><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{p.address}</div></td>
                  <td className="px-4 py-3 text-sm text-foreground max-w-xs"><div className="line-clamp-2">{p.proposalDescription}</div></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.proposalFile && <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-0.5"><ExternalLink size={11} />Prop</span>}
                      {p.assessmentFile && <span className="text-xs text-violet-600 cursor-pointer flex items-center gap-0.5"><ExternalLink size={11} />Assess</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
                      <button onClick={() => setToDelete(p)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada proposal dengan filter ini.</div>}
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {displayed.length} dari {items.length} proposal</div>
      </div>
      {showForm && <ProposalForm onClose={() => setShowForm(false)} onSave={onAdd} nextRegNo={nextRegNo} />}
      {editing && <ProposalForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.regNo} />}
      {toDelete && <DeleteConfirm label={`${toDelete.regNo} — ${toDelete.institution}`} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── CSR Projects ─────────────────────────────────────────────────────────────

function CsrForm({ initial, onClose, onSave }: { initial?: CsrProject; onClose: () => void; onSave: (d: Omit<CsrProject, "id">) => void }) {
  const [f, setF] = useState({ year: String(initial?.year ?? 2026), program: initial?.program ?? "", activity: initial?.activity ?? "", type: initial?.type ?? "", location: initial?.location ?? "", target: initial?.target ?? "", objective: initial?.objective ?? "", status: initial?.status ?? "Planning", budget: String(initial?.budget ?? ""), period: initial?.period ?? "", docs: initial?.docs ?? "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.program) return; onSave({ ...f, year: Number(f.year), budget: Number(f.budget) || 0, docs: f.docs || null }); onClose(); };
  return (
    <Modal title={initial ? "Edit CSR Project" : "Tambah CSR Project"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tahun"><input type="number" value={f.year} onChange={e => set("year", e.target.value)} className={`${inputCls} font-mono`} /></Field>
          <div className="col-span-2"><Field label="Nama Program" required><input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama program CSR" className={inputCls} /></Field></div>
        </div>
        <Field label="Aktivitas / Kegiatan"><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Deskripsi aktivitas program" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jenis"><input type="text" value={f.type} onChange={e => set("type", e.target.value)} placeholder="Infrastruktur, Pendidikan, Ekonomi…" className={inputCls} /></Field>
          <Field label="Lokasi"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Nama desa / kecamatan" className={inputCls} /></Field>
          <Field label="Target Penerima Manfaat"><input type="text" value={f.target} onChange={e => set("target", e.target.value)} placeholder="cth: 500 KK" className={inputCls} /></Field>
          <Field label="Periode Pelaksanaan"><input type="text" value={f.period} onChange={e => set("period", e.target.value)} placeholder="Jan – Des 2026" className={inputCls} /></Field>
        </div>
        <Field label="Tujuan / Objektif"><textarea rows={2} value={f.objective} onChange={e => set("objective", e.target.value)} placeholder="Tujuan program" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Planning</option><option>On Going</option><option>Completed</option><option>Cancelled</option></select></Field>
          <Field label="Budget (Rp)"><input type="number" value={f.budget} onChange={e => set("budget", e.target.value)} placeholder="0" className={`${inputCls} font-mono`} /></Field>
        </div>
        <Field label="Link Dokumen (SharePoint)"><input type="text" value={f.docs} onChange={e => set("docs", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

function CSRModule({ items, onAdd, onEdit, onDelete, onExport }: { items: CsrProject[]; onAdd: (d: Omit<CsrProject, "id">) => void; onEdit: (id: number, d: Omit<CsrProject, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["program", "activity", "type", "location", "target"]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CsrProject | null>(null);
  const [toDelete, setToDelete] = useState<CsrProject | null>(null);
  const displayed = statusFilter === "All" ? filtered : filtered.filter(c => c.status === statusFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="CSR Projects" subtitle="Program tanggung jawab sosial perusahaan tahun berjalan" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("CSR Projects")}>
        <div className="flex gap-1">
          {["All","Planning","On Going","Completed","Cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>{s === "All" ? "Semua" : s}</button>
          ))}
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {displayed.length > 0 && <div className="text-xs text-muted-foreground font-mono">{displayed.length} program · Total budget: <span className="text-foreground font-semibold">{formatIDR(displayed.reduce((s, c) => s + c.budget, 0))}</span></div>}
        {displayed.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><StatusBadge status={p.status} /><span className="text-xs font-mono text-muted-foreground">{p.type}</span></div>
                <h3 className="text-sm font-semibold text-foreground">{p.program}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.activity}</p>
              </div>
              <div className="flex items-start gap-2 shrink-0">
                <div className="text-right"><div className="text-xs text-muted-foreground font-mono">Budget</div><div className="text-sm font-semibold font-mono">{p.budget ? formatIDR(p.budget) : "—"}</div></div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => setToDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-4 text-xs">
              <div><span className="text-muted-foreground">Lokasi</span><div className="font-medium text-foreground mt-0.5">{p.location}</div></div>
              <div><span className="text-muted-foreground">Target</span><div className="font-medium text-foreground mt-0.5">{p.target}</div></div>
              <div><span className="text-muted-foreground">Periode</span><div className="font-medium font-mono text-foreground mt-0.5">{p.period}</div></div>
              <div className="flex items-end">{p.docs && <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-1"><ExternalLink size={11} />Dokumen</span>}</div>
            </div>
            {p.objective && <div className="mt-2 text-xs text-muted-foreground italic leading-relaxed">{p.objective}</div>}
          </div>
        ))}
        {displayed.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Belum ada program CSR dengan filter ini.</div>}
      </div>
      {showForm && <CsrForm onClose={() => setShowForm(false)} onSave={onAdd} />}
      {editing && <CsrForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── Grievance ────────────────────────────────────────────────────────────────

function GrievanceForm({ initial, onClose, onSave, nextRegNo }: { initial?: Grievance; onClose: () => void; onSave: (d: Omit<Grievance, "id">) => void; nextRegNo: string }) {
  const [f, setF] = useState({ regNo: initial?.regNo ?? nextRegNo, logDate: initial?.logDate ?? "", name: initial?.name ?? "", address: initial?.address ?? "", phone: initial?.phone ?? "", category: initial?.category ?? "", significance: initial?.significance ?? "Medium", description: initial?.description ?? "", location: initial?.location ?? "", investigation: initial?.investigation ?? "", resolution: initial?.resolution ?? "", feedback: initial?.feedback ?? "", status: initial?.status ?? "Open", completionDate: initial?.completionDate ?? "", supportFile: initial?.supportFile ?? "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.name || !f.logDate) return; onSave({ ...f, resolution: f.resolution || null, feedback: f.feedback || null, completionDate: f.completionDate || null, supportFile: f.supportFile || null }); onClose(); };
  return (
    <Modal title={initial ? "Edit Pengaduan" : "Tambah Pengaduan (Grievance)"} onClose={onClose} size="lg">
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Registrasi"><input type="text" value={f.regNo} readOnly className={`${inputCls} font-mono bg-muted cursor-default`} /></Field>
          <Field label="Tanggal Pengaduan" required><input type="date" value={f.logDate} onChange={e => set("logDate", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Nama Pelapor" required><input type="text" value={f.name} onChange={e => set("name", e.target.value)} placeholder="Nama lengkap pelapor" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Alamat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat lengkap" className={inputCls} /></Field>
          <Field label="Telepon"><input type="text" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="0812-xxxx-xxxx" className={`${inputCls} font-mono`} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kategori"><input type="text" value={f.category} onChange={e => set("category", e.target.value)} placeholder="Lingkungan, Kebisingan, dst" className={inputCls} /></Field>
          <Field label="Signifikansi"><select value={f.significance} onChange={e => set("significance", e.target.value)} className={inputCls}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></Field>
        </div>
        <Field label="Deskripsi Pengaduan"><textarea rows={3} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Uraian lengkap pengaduan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Lokasi Kejadian"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Titik lokasi kejadian" className={inputCls} /></Field>
        <Field label="Investigasi"><textarea rows={2} value={f.investigation} onChange={e => set("investigation", e.target.value)} placeholder="Tindakan investigasi yang sudah dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Resolusi"><textarea rows={2} value={f.resolution} onChange={e => set("resolution", e.target.value)} placeholder="Tindakan penyelesaian yang dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Feedback Pelapor"><textarea rows={2} value={f.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Tanggapan / feedback dari pelapor" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Open</option><option>On Progress</option><option>Resolved</option><option>Closed</option></select></Field>
          <Field label="Tanggal Selesai"><input type="date" value={f.completionDate} onChange={e => set("completionDate", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Link Dokumen Pendukung"><input type="text" value={f.supportFile} onChange={e => set("supportFile", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"} isEdit={!!initial} />
    </Modal>
  );
}

function GrievanceModule({ items, onAdd, onEdit, onDelete, onExport }: { items: Grievance[]; onAdd: (d: Omit<Grievance, "id">) => void; onEdit: (id: number, d: Omit<Grievance, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["name", "regNo", "category", "description", "location"]);
  const [sigFilter, setSigFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<number | null>(items[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Grievance | null>(null);
  const [toDelete, setToDelete] = useState<Grievance | null>(null);
  const nextRegNo = `GRV-2026-${String(items.length + 1).padStart(4, "0")}`;
  const displayed = filtered.filter(g => sigFilter === "All" || g.significance === sigFilter).filter(g => statusFilter === "All" || g.status === statusFilter);
  const detail = items.find(g => g.id === selected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Grievance" subtitle="Penanganan pengaduan & keluhan dari masyarakat" addLabel="Tambah Pengaduan" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Grievance")}>
        <div className="flex gap-1">
          {["All","Low","Medium","High","Critical"].map(s => (
            <button key={s} onClick={() => setSigFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${sigFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
      </TopBar>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto bg-card flex flex-col">
          <div className="p-2 border-b border-border flex gap-1 flex-wrap shrink-0">
            {["All","Open","On Progress","Resolved","Closed"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 text-[10px] rounded font-medium font-mono transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{s === "All" ? "Semua" : s}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayed.map(g => (
              <button key={g.id} onClick={() => setSelected(g.id)} className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors ${selected === g.id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-muted/50"}`}>
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-mono text-blue-600">{g.regNo}</span><SignificanceBadge level={g.significance} /></div>
                <div className="text-sm font-medium text-foreground truncate">{g.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{formatDate(g.logDate)} · {g.category}</div>
                <div className="mt-1.5"><StatusBadge status={g.status} /></div>
              </button>
            ))}
            {displayed.length === 0 && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Tidak ada pengaduan.</div>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {detail ? (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div><span className="text-xs font-mono text-blue-600">{detail.regNo}</span><h2 className="text-base font-semibold text-foreground mt-0.5">{detail.name}</h2></div>
                <div className="flex items-center gap-2">
                  <SignificanceBadge level={detail.significance} /><StatusBadge status={detail.status} />
                  <button onClick={() => setEditing(detail)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => setToDelete(detail)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-card rounded-xl border border-border p-4 text-sm">
                <div><span className="text-xs text-muted-foreground">Alamat</span><div className="font-medium mt-0.5">{detail.address}</div></div>
                <div><span className="text-xs text-muted-foreground">Telepon</span><div className="font-medium font-mono mt-0.5">{detail.phone}</div></div>
                <div><span className="text-xs text-muted-foreground">Kategori</span><div className="font-medium mt-0.5">{detail.category}</div></div>
                <div><span className="text-xs text-muted-foreground">Tanggal Log</span><div className="font-medium font-mono mt-0.5">{formatDate(detail.logDate)}</div></div>
                {detail.completionDate && <div><span className="text-xs text-muted-foreground">Tgl Selesai</span><div className="font-medium font-mono mt-0.5">{formatDate(detail.completionDate)}</div></div>}
              </div>
              {[{ label: "Deskripsi Pengaduan", val: detail.description }, { label: "Lokasi Kejadian", val: detail.location }, { label: "Investigasi", val: detail.investigation }, { label: "Resolusi", val: detail.resolution }, { label: "Feedback Pelapor", val: detail.feedback }].map(({ label, val }) => val && (
                <div key={label} className="bg-card rounded-xl border border-border p-4"><div className="text-xs font-medium text-muted-foreground mb-2">{label}</div><p className="text-sm text-foreground leading-relaxed">{val}</p></div>
              ))}
              {detail.supportFile && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-100 bg-blue-50 rounded px-3 py-1.5 cursor-pointer"><ExternalLink size={11} /> Dokumen Pendukung</span>}
            </div>
          ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Pilih pengaduan di sebelah kiri.</div>}
        </div>
      </div>
      {showForm && <GrievanceForm onClose={() => setShowForm(false)} onSave={onAdd} nextRegNo={nextRegNo} />}
      {editing && <GrievanceForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.regNo} />}
      {toDelete && <DeleteConfirm label={`${toDelete.regNo} — ${toDelete.name}`} onCancel={() => setToDelete(null)} onConfirm={() => { if (selected === toDelete.id) setSelected(items.find(g => g.id !== toDelete.id)?.id ?? null); onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── LRP ─────────────────────────────────────────────────────────────────────

function LrpForm({ initial, onClose, onSave }: { initial?: LrpProgram; onClose: () => void; onSave: (d: Omit<LrpProgram, "id">) => void }) {
  const [f, setF] = useState({ program: initial?.program ?? "", link: initial?.link ?? "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { if (!f.program || !f.link) return; onSave(f); onClose(); };
  return (
    <Modal title={initial ? "Edit Program LRP" : "Tambah Program LRP"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Nama Program" required><input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama / judul program LRP" className={inputCls} /></Field>
        <Field label="SharePoint Link" required hint="Link ke folder atau file di SharePoint (docx, pdf, gambar, dst). Dokumen harus sudah diupload ke SharePoint terlebih dahulu.">
          <input type="text" value={f.link} onChange={e => set("link", e.target.value)} placeholder="https://sharepoint/lrp/…" className={`${inputCls} font-mono`} />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

function LRPModule({ items, onAdd, onEdit, onDelete, onExport }: { items: LrpProgram[]; onAdd: (d: Omit<LrpProgram, "id">) => void; onEdit: (id: number, d: Omit<LrpProgram, "id">) => void; onDelete: (id: number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["program", "link"]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LrpProgram | null>(null);
  const [toDelete, setToDelete] = useState<LrpProgram | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="LRP — Livelihood Restoration Program" subtitle="Program community development & pemulihan mata pencaharian" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("LRP")} />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">Modul ini belum memiliki sheet Excel berjalan — akan masuk ke sheet baru saat Export &amp; Sync berikutnya. Dokumen harus diupload ke SharePoint terlebih dahulu, lalu paste link-nya di sini.</p>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No","Nama Program","SharePoint Link",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide last:w-20">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{p.program}</td>
                  <td className="px-4 py-3"><span className="text-xs text-blue-600 font-mono flex items-center gap-1.5 cursor-pointer hover:underline"><ExternalLink size={10} className="shrink-0" />{p.link}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
                      <button onClick={() => setToDelete(p)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Belum ada program LRP.</div>}
        </div>
      </div>
      {showForm && <LrpForm onClose={() => setShowForm(false)} onSave={onAdd} />}
      {editing && <LrpForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

// ─── Sync Modal ───────────────────────────────────────────────────────────────

type SyncState = "confirm" | "loading" | "success" | "error";
const SHEETS = ["Daily Activities","Stakeholder Engagement","Top Issues","Proposals","CSR Projects","Grievance","LRP"];

function SyncModal({ onClose, totalUnsynced, onSuccess }: { onClose: () => void; totalUnsynced: number; onSuccess: () => void }) {
  const [state, setState] = useState<SyncState>("confirm");
  const [progress, setProgress] = useState(0);
  const [currentSheet, setCurrentSheet] = useState("");

  const handleStart = useCallback(() => {
    setState("loading");
    setProgress(0);
    SHEETS.forEach((sheet, i) => {
      setTimeout(() => {
        setCurrentSheet(sheet);
        setProgress(Math.round(((i + 1) / SHEETS.length) * 100));
        if (i === SHEETS.length - 1) setTimeout(() => { setState("success"); onSuccess(); }, 500);
      }, i * 400);
    });
  }, [onSuccess]);

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
              <div><div className="text-sm font-medium text-foreground">Sedang memproses…</div><div className="text-xs text-muted-foreground font-mono mt-0.5">{currentSheet}</div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-mono"><span>Progress</span><span>{progress}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="space-y-1.5">
              {SHEETS.map((s, i) => {
                const done = progress >= Math.round(((i + 1) / SHEETS.length) * 100);
                const active = currentSheet === s && !done;
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
  const [showSync, setShowSync] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(3);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>(SEED_SYNC);

  const [daily, setDaily] = useState<DailyActivity[]>(SEED_DAILY);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(SEED_STAKEHOLDERS);
  const [issues, setIssues] = useState<TopIssue[]>(SEED_ISSUES);
  const [proposals, setProposals] = useState<Proposal[]>(SEED_PROPOSALS);
  const [csr, setCsr] = useState<CsrProject[]>(SEED_CSR);
  const [grievances, setGrievances] = useState<Grievance[]>(SEED_GRIEVANCES);
  const [lrp, setLrp] = useState<LrpProgram[]>(SEED_LRP);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleExport = useCallback((label: string) => {
    showToast(`Mengunduh "${label}.xlsx"…`, "info");
    setTimeout(() => showToast(`"${label}.xlsx" berhasil diunduh`), 1800);
  }, [showToast]);

  function makeAdder<T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>, arr: T[], label: string) {
    return (data: Omit<T, "id">) => {
      setter(prev => [{ ...data, id: nextId(prev) } as T, ...prev]);
      setUnsyncedCount(c => c + 1);
      showToast(`${label} berhasil ditambahkan`);
    };
  }

  function makeEditor<T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>, label: string) {
    return (id: number, data: Omit<T, "id">) => {
      setter(prev => prev.map(x => x.id === id ? { ...data, id } as T : x));
      setUnsyncedCount(c => c + 1);
      showToast(`${label} berhasil diperbarui`);
    };
  }

  function makeDeleter<T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>) {
    return (id: number) => {
      setter(prev => prev.filter(x => x.id !== id));
      setUnsyncedCount(c => c + 1);
      showToast("Data berhasil dihapus");
    };
  }

  const handleSyncSuccess = useCallback(() => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    setSyncHistory(prev => [{ id: nextId(prev), syncedAt: ts, status: "SUCCESS" }, ...prev]);
    setUnsyncedCount(0);
  }, []);

  const counts = { daily: daily.length, stakeholder: stakeholders.length, topissues: issues.length, proposals: proposals.length, csr: csr.length, grievance: grievances.length, lrp: lrp.length };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar active={activeModule} onNav={setActiveModule} counts={counts} unsyncedCount={unsyncedCount} onSync={() => setShowSync(true)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeModule === "dashboard" && <Dashboard onNav={setActiveModule} daily={daily} stakeholders={stakeholders} issues={issues} proposals={proposals} csr={csr} grievances={grievances} syncHistory={syncHistory} />}
        {activeModule === "daily" && <DailyActivitiesModule onExport={handleExport} />}
        {activeModule === "stakeholder" && <StakeholderModule items={stakeholders} onAdd={makeAdder(setStakeholders, stakeholders, "Stakeholder")} onEdit={makeEditor(setStakeholders, "Stakeholder")} onDelete={makeDeleter(setStakeholders)} onExport={handleExport} />}
        {activeModule === "topissues" && <TopIssuesModule items={issues} onAdd={makeAdder(setIssues, issues, "Isu")} onEdit={makeEditor(setIssues, "Isu")} onDelete={makeDeleter(setIssues)} onExport={handleExport} />}
        {activeModule === "proposals" && <ProposalsModule items={proposals} onAdd={makeAdder(setProposals, proposals, "Proposal")} onEdit={makeEditor(setProposals, "Proposal")} onDelete={makeDeleter(setProposals)} onExport={handleExport} />}
        {activeModule === "csr" && <CSRModule items={csr} onAdd={makeAdder(setCsr, csr, "Program CSR")} onEdit={makeEditor(setCsr, "Program CSR")} onDelete={makeDeleter(setCsr)} onExport={handleExport} />}
        {activeModule === "grievance" && <GrievanceModule items={grievances} onAdd={makeAdder(setGrievances, grievances, "Pengaduan")} onEdit={makeEditor(setGrievances, "Pengaduan")} onDelete={makeDeleter(setGrievances)} onExport={handleExport} />}
        {activeModule === "lrp" && <LRPModule items={lrp} onAdd={makeAdder(setLrp, lrp, "Program LRP")} onEdit={makeEditor(setLrp, "Program LRP")} onDelete={makeDeleter(setLrp)} onExport={handleExport} />}
      </main>
      {showSync && <SyncModal onClose={() => setShowSync(false)} totalUnsynced={unsyncedCount} onSuccess={handleSyncSuccess} />}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
