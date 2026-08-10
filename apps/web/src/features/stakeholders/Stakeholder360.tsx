import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Users,
  MessageSquareWarning,
  ExternalLink,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useStakeholder } from '../../hooks/useStakeholders';
import { apiClient } from '../../lib/apiClient';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { StakeholderDailyActivity, StakeholderEngagementItem } from '../../api/stakeholders';

interface RelatedGrievance {
  id: string | number;
  register_no: string;
  log_date: string;
  complainant_name: string;
  category?: string;
  significance?: string;
  description?: string;
  status?: string;
}

interface Stakeholder360Props {
  id?: string;
  onBack?: () => void;
}

const parseDocumentLinks = (link?: string | null): string[] => {
  if (!link) return [];
  const trimmed = link.trim();
  if (!trimmed || trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.trim() !== "");
      }
    } catch {
      // fallback
    }
  }
  return [trimmed];
};

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

export function Stakeholder360({ id: propId, onBack }: Stakeholder360Props) {
  const params = useParams<{ id: string }>();
  const stakeholderId = propId || params.id || '';

  const { data: stakeholder, isLoading, isError, error } = useStakeholder(stakeholderId);

  const [grievances, setGrievances] = useState<RelatedGrievance[]>([]);
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'engagements' | 'grievances'>('daily');

  const [dailySearch, setDailySearch] = useState('');
  const [engagementSearch, setEngagementSearch] = useState('');
  const [grievanceSearch, setGrievanceSearch] = useState('');

  // Fetch grievances matching this stakeholder
  useEffect(() => {
    if (!stakeholder?.name) return;
    let isMounted = true;
    setLoadingGrievances(true);
    apiClient
      .get('/grievance')
      .then((res) => {
        if (!isMounted) return;
        const allGrievances: RelatedGrievance[] = res.data?.data || [];
        const stNameLower = stakeholder.name.toLowerCase().trim();
        const matched = allGrievances.filter((g) => {
          const compLower = (g.complainant_name || '').toLowerCase().trim();
          return compLower.includes(stNameLower) || stNameLower.includes(compLower);
        });
        setGrievances(matched);
      })
      .catch((err) => {
        console.error('Error fetching grievances for 360 view:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingGrievances(false);
      });

    return () => {
      isMounted = false;
    };
  }, [stakeholder?.name]);

  const dailyActivities = useMemo(() => stakeholder?.daily_activities || [], [stakeholder]);
  const engagements = useMemo(() => stakeholder?.stakeholder_engagement || [], [stakeholder]);

  const filteredDaily = useMemo(() => {
    if (!dailySearch.trim()) return dailyActivities;
    const q = dailySearch.toLowerCase().trim();
    return dailyActivities.filter(
      (a) =>
        a.activity?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.description_result?.toLowerCase().includes(q) ||
        a.category?.name?.toLowerCase().includes(q) ||
        a.sub_category?.name?.toLowerCase().includes(q) ||
        a.pic?.name?.toLowerCase().includes(q)
    );
  }, [dailyActivities, dailySearch]);

  const filteredEngagements = useMemo(() => {
    if (!engagementSearch.trim()) return engagements;
    const q = engagementSearch.toLowerCase().trim();
    return engagements.filter(
      (e) =>
        e.venue?.toLowerCase().includes(q) ||
        e.concern_issue?.toLowerCase().includes(q)
    );
  }, [engagements, engagementSearch]);

  const filteredGrievances = useMemo(() => {
    if (!grievanceSearch.trim()) return grievances;
    const q = grievanceSearch.toLowerCase().trim();
    return grievances.filter(
      (g) =>
        g.register_no?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q)
    );
  }, [grievances, grievanceSearch]);

  // Column definitions for Daily Activities
  const dailyColumns: ColumnDef<StakeholderDailyActivity>[] = useMemo(
    () => [
      {
        header: 'No',
        render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>,
      },
      {
        header: 'Tanggal',
        accessor: 'activity_date',
        sortable: true,
        render: (a) => (
          <span className="text-xs font-mono text-foreground">{formatDate(a.activity_date)}</span>
        ),
      },
      {
        header: 'Aktivitas',
        accessor: 'activity',
        sortable: true,
        render: (a) => (
          <div className="text-sm font-medium text-foreground max-w-xs leading-snug">
            {a.activity}
          </div>
        ),
      },
      {
        header: 'Kategori / Sub',
        render: (a) => (
          <div className="text-xs text-muted-foreground">
            {a.category?.name ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                {a.category.name}
              </span>
            ) : (
              '—'
            )}
            {a.sub_category?.name && (
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                {a.sub_category.name}
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'PIC',
        render: (a) => (
          <span className="text-xs font-medium text-foreground">{a.pic?.name || '—'}</span>
        ),
      },
      {
        header: 'Lokasi',
        render: (a) => (
          <span className="text-xs text-muted-foreground">{a.location || a.address || '—'}</span>
        ),
      },
      {
        header: 'Hasil / Deskripsi',
        render: (a) => (
          <div className="text-xs text-muted-foreground max-w-xs line-clamp-2">
            {a.description_result || '—'}
          </div>
        ),
      },
      {
        header: 'Dokumen',
        className: 'text-center',
        render: (a) => {
          const links = parseDocumentLinks(a.document_link);
          if (links.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                  title="Buka Dokumen"
                >
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  // Column definitions for Engagements
  const engagementColumns: ColumnDef<StakeholderEngagementItem>[] = useMemo(
    () => [
      {
        header: 'No',
        render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>,
      },
      {
        header: 'Tanggal & Tempat',
        render: (e) => (
          <div>
            <div className="text-xs font-mono font-medium text-foreground">{formatDate(e.date)}</div>
            {e.venue && <div className="text-xs text-muted-foreground mt-0.5">{e.venue}</div>}
          </div>
        ),
      },
      {
        header: 'Concern / Isu yang Dibahas',
        render: (e) => (
          <div className="text-sm text-foreground max-w-md leading-snug">
            {e.concern_issue || '—'}
          </div>
        ),
      },
      {
        header: 'Dokumen',
        className: 'text-center',
        render: (e) => {
          const links = parseDocumentLinks(e.document_link);
          if (links.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                  title="Buka Dokumen"
                >
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  // Column definitions for Grievances
  const grievanceColumns: ColumnDef<RelatedGrievance>[] = useMemo(
    () => [
      {
        header: 'No',
        render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>,
      },
      {
        header: 'No. Register',
        accessor: 'register_no',
        sortable: true,
        render: (g) => <span className="text-xs font-mono font-medium text-foreground">{g.register_no}</span>,
      },
      {
        header: 'Tanggal',
        render: (g) => <span className="text-xs font-mono text-muted-foreground">{formatDate(g.log_date)}</span>,
      },
      {
        header: 'Kategori',
        render: (g) => <span className="text-xs text-muted-foreground">{g.category || '—'}</span>,
      },
      {
        header: 'Signifikansi',
        render: (g) => (
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
              g.significance?.toLowerCase() === 'high' || g.significance?.toLowerCase() === 'critical'
                ? 'bg-red-500/10 text-red-600'
                : g.significance?.toLowerCase() === 'medium'
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-blue-500/10 text-blue-600'
            }`}
          >
            {g.significance || 'Low'}
          </span>
        ),
      },
      {
        header: 'Deskripsi Keluhan',
        render: (g) => (
          <div className="text-xs text-foreground max-w-xs line-clamp-2">{g.description || '—'}</div>
        ),
      },
      {
        header: 'Status',
        render: (g) => (
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded ${
              g.status?.toLowerCase() === 'closed' || g.status?.toLowerCase() === 'resolved'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {g.status || 'Open'}
          </span>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-medium">Memuat Profil Stakeholder 360°…</p>
      </div>
    );
  }

  if (isError || !stakeholder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
          <XCircle size={24} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Stakeholder Tidak Ditemukan</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {(error as any)?.message || 'Data stakeholder tidak ditemukan atau telah dihapus.'}
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Kembali ke Master Data
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header Bar */}
      <div className="px-6 py-5 bg-card border-b border-border flex items-center justify-between gap-4 flex-wrap shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Kembali ke Master Data"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Kembali ke Master Data</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-foreground tracking-tight">
                  {stakeholder.name}
                </h1>
                {stakeholder.is_active ? (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    Nonaktif
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Stakeholder 360° Profile & Dashboard Analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Daily Activities */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Daily Activities
                </p>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                  {dailyActivities.length}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Aktivitas harian tercatat</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60" />
          </div>

          {/* Card 2: Engagement Meetings */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Engagement Meetings
                </p>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                  {engagements.length}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Pertemuan & diskusi</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-60" />
          </div>

          {/* Card 3: Related Grievances */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Related Grievances
                </p>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                  {loadingGrievances ? '…' : grievances.length}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Keluhan & isu terkait</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                <MessageSquareWarning size={20} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
          </div>
        </div>

        {/* Tabbed Section */}
        <Tabs.Root
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col"
        >
          {/* Tab List */}
          <Tabs.List className="flex items-center border-b border-border bg-muted/30 px-4 pt-2 gap-2 overflow-x-auto">
            <Tabs.Trigger
              value="daily"
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
                activeTab === 'daily'
                  ? 'border-primary text-primary bg-card shadow-xs font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Calendar size={14} />
              <span>Daily Activities</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono">
                {dailyActivities.length}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="engagements"
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
                activeTab === 'engagements'
                  ? 'border-primary text-primary bg-card shadow-xs font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Users size={14} />
              <span>Stakeholder Engagements</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-500 font-mono">
                {engagements.length}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="grievances"
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
                activeTab === 'grievances'
                  ? 'border-primary text-primary bg-card shadow-xs font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <MessageSquareWarning size={14} />
              <span>Related Grievances</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-500 font-mono">
                {grievances.length}
              </span>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab 1 Content: Daily Activities */}
          <Tabs.Content value="daily" className="p-6 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Daftar Aktivitas Harian</h4>
                <p className="text-xs text-muted-foreground">
                  Riwayat aktivitas harian yang melibatkan {stakeholder.name}
                </p>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={dailySearch}
                  onChange={(e) => setDailySearch(e.target.value)}
                  placeholder="Cari aktivitas…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-52 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {filteredDaily.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                {dailyActivities.length === 0
                  ? 'Belum ada data aktivitas harian untuk stakeholder ini.'
                  : 'Tidak ada aktivitas yang cocok dengan pencarian.'}
              </div>
            ) : (
              <DataTable columns={dailyColumns} data={filteredDaily} />
            )}
          </Tabs.Content>

          {/* Tab 2 Content: Engagements */}
          <Tabs.Content value="engagements" className="p-6 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Daftar Stakeholder Engagements</h4>
                <p className="text-xs text-muted-foreground">
                  Rekaman pertemuan &amp; komunikasi dengan {stakeholder.name}
                </p>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={engagementSearch}
                  onChange={(e) => setEngagementSearch(e.target.value)}
                  placeholder="Cari engagement…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-52 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {filteredEngagements.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                {engagements.length === 0
                  ? 'Belum ada data pertemuan engagement untuk stakeholder me ini.'
                  : 'Tidak ada engagement yang cocok dengan pencarian.'}
              </div>
            ) : (
              <DataTable columns={engagementColumns} data={filteredEngagements} />
            )}
          </Tabs.Content>

          {/* Tab 3 Content: Grievances */}
          <Tabs.Content value="grievances" className="p-6 space-y-4 focus:outline-none">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Daftar Keluhan / Grievances Terkait</h4>
                <p className="text-xs text-muted-foreground">
                  Keluhan atau isu yang disampaikan oleh {stakeholder.name}
                </p>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={grievanceSearch}
                  onChange={(e) => setGrievanceSearch(e.target.value)}
                  placeholder="Cari keluhan…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-52 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {loadingGrievances ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Memuat data keluhan…</div>
            ) : filteredGrievances.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                {grievances.length === 0
                  ? 'Belum ada data keluhan yang tercatat untuk stakeholder ini.'
                  : 'Tidak ada keluhan yang cocok dengan pencarian.'}
              </div>
            ) : (
              <DataTable columns={grievanceColumns} data={filteredGrievances} />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

export default Stakeholder360;
