# PIC Management UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the PIC Management Modal by adding loading states, visual click feedback, and error/success toast notifications to prevent silent failures.

**Architecture:** We will lift the `showToast` dependency from `DailyActivitiesModule` into `PicManagementModal`. Inside the modal, we will manage an `isSubmitting` state to disable buttons during API requests, and wrap all API calls in `try/catch` blocks to display appropriate toasts. We will also add CSS utility classes for micro-animations.

**Tech Stack:** React, Tailwind CSS, Axios (via apiClient)

---

### Task 1: Update DailyActivitiesModule to pass showToast

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Pass `showToast` prop to `PicManagementModal`**

Update the rendering of `PicManagementModal` inside `DailyActivitiesModule.tsx` (around line 224) to include the `showToast` prop.

```tsx
// Inside DailyForm component (around line 224)
{showPicManager && <PicManagementModal onClose={() => { setShowPicManager(false); onRefreshReferences(); }} showToast={showToast} />}
```

- [ ] **Step 2: Type checking**

Run typescript check to verify there's a type error because `PicManagementModal` doesn't accept `showToast` yet.

Run: `npx tsc --noEmit -p apps/web/tsconfig.json` (or just verify manually if no tsconfig available for web specifically).
Expected: Error about `showToast` missing on `PicManagementModal`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "refactor: pass showToast to PicManagementModal"
```

---

### Task 2: Update PicManagementModal Props and State

**Files:**
- Modify: `apps/web/src/features/daily-activities/PicManagementModal.tsx`

- [ ] **Step 1: Update component signature and add `isSubmitting` state**

Modify the props interface and add the `isSubmitting` state at the top of the component.

```tsx
export function PicManagementModal({ onClose, showToast }: { onClose: () => void, showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [pics, setPics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ... rest of state
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/daily-activities/PicManagementModal.tsx
git commit -m "feat: add showToast prop and isSubmitting state to PicManagementModal"
```

---

### Task 3: Implement Error Handling and Toasts in API Handlers

**Files:**
- Modify: `apps/web/src/features/daily-activities/PicManagementModal.tsx`

- [ ] **Step 1: Update `handleAdd`**

```tsx
  const handleAdd = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/pics', { name: newName });
      setNewName("");
      showToast(`PIC '${newName}' berhasil ditambahkan`, "success");
      loadPics();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menambahkan PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 2: Update `handleUpdate`**

```tsx
  const handleUpdate = async (id: string) => {
    if (!editName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/pics/${id}`, { name: editName });
      setEditingId(null);
      showToast(`PIC '${editName}' berhasil diperbarui`, "success");
      loadPics();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 3: Update `handleDelete`**

```tsx
  const handleDelete = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/pics/${id}`);
      showToast("PIC berhasil dihapus", "success");
      loadPics();
      setPicToDelete(null);
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/daily-activities/PicManagementModal.tsx
git commit -m "feat: handle api errors and show toasts in PIC modal"
```

---

### Task 4: Add Micro-animations and Disabled States to UI

**Files:**
- Modify: `apps/web/src/features/daily-activities/PicManagementModal.tsx`

- [ ] **Step 1: Update action buttons for Edit Mode**

Locate the action buttons for `editingId === p.id` and add `active:scale-90 transition-transform` and disabled states.

```tsx
// Edit actions
<div className="flex justify-end gap-1">
  <button 
    onClick={() => handleUpdate(p.id)} 
    disabled={isSubmitting}
    className={`p-1 text-green-600 hover:bg-green-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Check size={14} />
  </button>
  <button 
    onClick={() => setEditingId(null)} 
    disabled={isSubmitting}
    className={`p-1 text-muted-foreground hover:bg-muted rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <X size={14} />
  </button>
</div>
```

- [ ] **Step 2: Update action buttons for View Mode**

Locate the action buttons for view mode and add animations and disabled states.

```tsx
// View actions
<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button 
    onClick={() => { setEditingId(p.id); setEditName(p.name); }} 
    disabled={isSubmitting}
    className={`p-1 text-blue-600 hover:bg-blue-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Edit2 size={13} />
  </button>
  <button 
    onClick={() => setPicToDelete(p)} 
    disabled={isSubmitting}
    className={`p-1 text-red-500 hover:bg-red-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Trash2 size={13} />
  </button>
</div>
```

- [ ] **Step 3: Update "Tambah" Button and Input**

Locate the add input and button at the bottom of the modal.

```tsx
<div className="px-6 py-4 border-t border-border flex gap-2 items-center bg-muted/20 shrink-0 rounded-b-2xl">
  <input 
    type="text" 
    value={newName} 
    onChange={e => setNewName(e.target.value)} 
    onKeyDown={e => e.key === 'Enter' && handleAdd()} 
    disabled={isSubmitting}
    placeholder="Nama PIC baru..." 
    className={`${inputCls} flex-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
  />
  <button 
    onClick={handleAdd} 
    disabled={isSubmitting}
    className={`px-3 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Plus size={14} />{isSubmitting ? "Memproses..." : "Tambah"}
  </button>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/daily-activities/PicManagementModal.tsx
git commit -m "style: add click animations and disabled states for pic modal buttons"
```
