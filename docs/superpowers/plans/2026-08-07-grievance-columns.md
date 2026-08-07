# Grievance UI Columns Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Grievance frontend table in `GrievanceModule.tsx` to display separate `Investigasi`, `Resolusi`, and `Feedback Pelapor` columns, and include all three fields in the client-side export functionality.

**Architecture:** We will modify the column definitions array in `GrievanceModule.tsx` to separate the merged resolution column into three distinct columns and update `handleExportClick` to include `Investigation`, `Resolution`, and `Complainant Feedback` in the export payload.

**Tech Stack:** React, TypeScript, TailwindCSS, Lucide Icons

---

### Task 1: Update Grievance Table Columns and Export Payload

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx:287-317`

- [ ] **Step 1: Check existing type compilation**
Run: `npx tsc --noEmit` from `apps/web` (or root) to confirm current codebase compiles cleanly.
Expected: Exit code 0.

- [ ] **Step 2: Update `columns` and `handleExportClick` in `GrievanceModule.tsx`**

Modify `apps/web/src/features/grievance/GrievanceModule.tsx`:

```tsx
  const columns: ColumnDef<Grievance>[] = useMemo(() => [
    { header: "No. Reg", accessor: "register_no", sortable: true, render: (g) => <div><span className="text-xs font-mono text-blue-600">{g.register_no}</span><div className="mt-1"><SignificanceBadge level={g.significance} /></div></div> },
    { header: "Pelapor & Kontak", accessor: "complainant_name", sortable: true, render: (g) => <div><div className="text-sm font-medium text-foreground">{g.complainant_name}</div><div className="text-xs text-muted-foreground mt-0.5">{g.phone}</div><div className="text-xs text-muted-foreground mt-0.5">{g.address}</div></div> },
    { header: "Tanggal & Kategori", accessor: "log_date", sortable: true, render: (g) => <div><div className="text-xs text-muted-foreground font-mono">{formatDate(g.log_date)}</div><div className="text-xs text-muted-foreground mt-0.5">{g.category}</div></div> },
    { header: "Deskripsi & Lokasi", accessor: "description", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal"><div className="text-sm text-foreground line-clamp-2">{g.description}</div><div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.location}</div></div> },
    { header: "Investigasi", accessor: "investigation", sortable: true, render: (g) => <div className="max-w-[180px] whitespace-normal"><div className="text-xs text-foreground line-clamp-2">{g.investigation || "—"}</div></div> },
    { header: "Resolusi", accessor: "resolution", sortable: true, render: (g) => <div className="max-w-[180px] whitespace-normal"><div className="text-xs text-foreground line-clamp-2">{g.resolution || "—"}</div></div> },
    { header: "Feedback Pelapor", accessor: "feedback", sortable: true, render: (g) => <div className="max-w-[180px] whitespace-normal"><div className="text-xs text-foreground line-clamp-2">{g.feedback || "—"}</div></div> },
    { header: "Status", accessor: "status", sortable: true, render: (g) => <div><StatusBadge status={g.status} />{g.completion_date && <div className="text-xs text-muted-foreground font-mono mt-1">Selesai: {formatDate(g.completion_date)}</div>}</div> },
    { header: "Docs", render: (g) => g.supporting_files ? <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-100 bg-blue-50 rounded px-2 py-1 cursor-pointer"><ExternalLink size={11} /> Dok</span> : <span className="text-muted-foreground text-xs">—</span> },
    { header: "", render: (g) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(g)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(g)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
      </div>
    )}
  ], []);

  const handleExportClick = () => {
    const exportData = displayed.map(g => ({
      "Register No": g.register_no,
      "Date": formatDate(g.log_date),
      "Complainant": g.complainant_name,
      "Category": g.category,
      "Significance": g.significance,
      "Description": g.description,
      "Location": g.location,
      "Investigation": g.investigation || "",
      "Resolution": g.resolution || "",
      "Complainant Feedback": g.feedback || "",
      "Status": g.status,
      "Remarks": g.remarks || ""
    }));
    onExport("Grievance", exportData);
  };
```

- [ ] **Step 3: Run TypeScript type check**
Run: `pnpm --filter ./apps/web exec tsc --noEmit`
Expected: Exit code 0 (no errors).

- [ ] **Step 4: Run web build to verify bundling**
Run: `pnpm --filter ./apps/web build`
Expected: Exit code 0 (build succeeds).

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "feat(grievance): add separate columns and export fields for investigation, resolution, and feedback"
```
