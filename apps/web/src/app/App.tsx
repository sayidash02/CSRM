import { apiClient } from "../lib/apiClient";
import { useState, useMemo, useCallback, useEffect } from "react";
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
import StakeholdersModule from "../features/stakeholders/StakeholdersModule";
import TopIssuesModule from "../features/top-issues/TopIssuesModule";
import ProposalsModule from "../features/proposals/ProposalsModule";
import CsrProjectsModule from "../features/csr-projects/CsrProjectsModule";
import GrievanceModule from "../features/grievance/GrievanceModule";
import LrpModule from "../features/lrp/LrpModule";

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
    daily.forEach(d => { const subName = d.sub_category?.name || String(d.sub_category_id); c[subName] = (c[subName] || 0) + 1; });
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
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{formatDate(a.activity_date)} · {a.pic?.name || String(a.pic_id)}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">{a.sub_category?.name || String(a.sub_category_id)}</span>
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

// ─── Sync Modal ───────────────────────────────────────────────────────────────

type SyncState = "confirm" | "loading" | "success" | "error";
const SHEETS = ["Daily Activities","Stakeholder Engagement","Top Issues","Proposals","CSR Projects","Grievance","LRP"];

function SyncModal({ onClose, totalUnsynced, onSuccess }: { onClose: () => void; totalUnsynced: number; onSuccess: () => void }) {
  const [state, setState] = useState<SyncState>("confirm");
  const [progress, setProgress] = useState(0);

  const handleStart = useCallback(async () => {
    setState("loading");
    setProgress(10);
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 500);
    try {
      await apiClient.post('/sync');
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { setState("success"); onSuccess(); }, 500);
    } catch (e) {
      clearInterval(interval);
      setState("error");
    }
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
              <div><div className="text-sm font-medium text-foreground">Sedang memproses…</div><div className="text-xs text-muted-foreground font-mono mt-0.5">Berkomunikasi dengan server</div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-mono"><span>Progress</span><span>{progress}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="space-y-1.5">
              {SHEETS.map((s, i) => {
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
  const [showSync, setShowSync] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>(SEED_SYNC);

  const fetchSyncStatus = useCallback(() => {
    apiClient.get('/sync/status').then(res => {
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
      setToast({ message: "Gagal memuat status sinkronisasi", type: "error" });
    });
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const [daily, setDaily] = useState<DailyActivity[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [issues, setIssues] = useState<TopIssue[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [csr, setCsr] = useState<CsrProject[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [lrp, setLrp] = useState<LrpProgram[]>([]);

  useEffect(() => {
    if (activeModule === "dashboard") {
      Promise.all([
        apiClient.get('/daily-activities').catch(() => ({ data: { data: [] } })),
        apiClient.get('/stakeholders').catch(() => ({ data: { data: [] } })),
        apiClient.get('/top-issues').catch(() => ({ data: { data: [] } })),
        apiClient.get('/proposals').catch(() => ({ data: { data: [] } })),
        apiClient.get('/csr-projects').catch(() => ({ data: { data: [] } })),
        apiClient.get('/grievance').catch(() => ({ data: { data: [] } })),
        apiClient.get('/lrp').catch(() => ({ data: { data: [] } }))
      ]).then(([d, s, i, p, c, g, l]) => {
        setDaily(d.data.data || []);
        setStakeholders(s.data.data || []);
        setIssues(i.data.data || []);
        setProposals(p.data.data || []);
        setCsr(c.data.data || []);
        setGrievances(g.data.data || []);
        setLrp(l.data.data || []);
      });
    }
  }, [activeModule]);

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
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const counts = { daily: daily.length, stakeholder: stakeholders.length, topissues: issues.length, proposals: proposals.length, csr: csr.length, grievance: grievances.length, lrp: lrp.length };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar active={activeModule} onNav={setActiveModule} counts={counts} unsyncedCount={unsyncedCount} onSync={() => setShowSync(true)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeModule === "dashboard" && <Dashboard onNav={setActiveModule} daily={daily} stakeholders={stakeholders} issues={issues} proposals={proposals} csr={csr} grievances={grievances} syncHistory={syncHistory} />}
        {activeModule === "daily" && <DailyActivitiesModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "stakeholder" && <StakeholdersModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "topissues" && <TopIssuesModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "proposals" && <ProposalsModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "csr" && <CsrProjectsModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "grievance" && <GrievanceModule onExport={handleExport} showToast={showToast} />}
        {activeModule === "lrp" && <LrpModule onExport={handleExport} showToast={showToast} />}
      </main>
      {showSync && <SyncModal onClose={() => setShowSync(false)} totalUnsynced={unsyncedCount} onSuccess={handleSyncSuccess} />}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}



