# Implementation Plan: Daily Activities Full Columns UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Daily Activities frontend table to display all 10 requested columns and support text wrapping for long content.

**Tech Stack:** React, TailwindCSS.

---

### Task 1: Update Table Headers & Row Structure

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Update Table Headers**
  Open `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`.
  Find the table header mapping:
  `{["No","Tanggal","Kegiatan","Institusi","Lokasi","PIC","Biaya","Docs",""].map(h => <th ...>{h}</th>)}`
  Replace it with:
  `{["No","Tanggal","Kegiatan","Fokus","Institusi & Alamat","Lokasi","PIC","Biaya","Keterangan & Hasil","Docs",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide">{h}</th>)}`

- [ ] **Step 2: Update Table Body Rows**
  Find the `<tbody>` section. Replace the existing `<td>` elements for the data rows with the new column layout. Ensure `whitespace-normal` is used instead of `truncate` for long text fields, and max-widths are set so they don't break the layout.

  Example Replacement:
  ```tsx
  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</td>
  <td className="px-4 py-3 max-w-[200px]"><div className="text-sm font-medium text-foreground whitespace-normal">{a.activity}</div></td>
  <td className="px-4 py-3 max-w-[150px]"><div className="text-xs text-muted-foreground whitespace-normal">{a.focus || <span className="text-muted-foreground/50">—</span>}</div></td>
  <td className="px-4 py-3 max-w-[200px]">
    <div className="text-sm font-medium text-foreground">{a.institution_group || <span className="text-muted-foreground/50">—</span>}</div>
    {a.address && <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal">{a.address}</div>}
  </td>
  <td className="px-4 py-3 text-xs text-foreground max-w-[150px] whitespace-normal">{a.location || <span className="text-muted-foreground/50">—</span>}</td>
  <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">{a.pic?.name || a.pic_id}</td>
  <td className="px-4 py-3 text-xs text-right font-mono whitespace-nowrap">{a.cost > 0 ? formatIDR(a.cost) : <span className="text-muted-foreground">—</span>}</td>
  <td className="px-4 py-3 max-w-[250px]"><div className="text-xs text-foreground whitespace-normal leading-relaxed">{a.description_result || <span className="text-muted-foreground/50">—</span>}</div></td>
  <td className="px-4 py-3 text-center">
    {a.document_link && a.document_link !== "[]" ? <span className="text-blue-600 cursor-pointer" title="Ada Lampiran Dokumen"><ExternalLink size={12} /></span> : <span className="text-muted-foreground text-xs">—</span>}
  </td>
  <td className="px-4 py-3">
    <div className="flex items-center gap-1 justify-end">
      <button onClick={() => setEditing(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
      <button onClick={() => setToDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
    </div>
  </td>
  ```

- [ ] **Step 3: Verification**
  Run `npx tsc --noEmit` in `apps/web` to ensure no syntax errors.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
  git commit -m "feat(web): update daily activities table to show all 10 columns with wrap text"
  ```

Report back when all tasks are complete.
