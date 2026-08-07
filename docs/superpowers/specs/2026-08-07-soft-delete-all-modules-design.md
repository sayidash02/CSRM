# Soft Delete & Restore UI Design (Remaining Modules)

**Context:** The CRMS system requires the soft delete and restore functionality to be implemented across all 7 modules. Phase 1 successfully implemented and validated the design on the backend (4 modules) and frontend (1 module). This specification dictates the rollout of this exact same validated design to the remaining components.

**Scope:**
- **Backend (3 modules):** LRP, Stakeholders, Top Issues
- **Frontend (6 modules):** Proposals, CSR Projects, Grievance, LRP, Stakeholders, Top Issues

## 1. Backend Architecture

### Design Pattern
The backend API pattern replicates the validated logic used in the `DailyActivitiesController`.

### API Updates
1. **GET Endpoints:**
   - Modify the `get` method in `LrpController`, `StakeholdersController`, and `TopIssuesController`.
   - Accept an optional query parameter `is_deleted`.
   - Update the Prisma `where` clause to filter `is_deleted: true` if `req.query.is_deleted === 'true'`, otherwise filter `is_deleted: false`. Keep existing default filters like `is_archived: false`.

2. **PATCH Endpoints (Restore):**
   - Introduce `restore[Entity]` methods in controllers.
   - Endpoint: `PATCH /api/[module]/:id/restore`
   - Action: `prisma.[entity].update({ where: { id: BigInt(id) }, data: { is_deleted: false } })`.

### Error Handling & Rules
- Intercept `P2025` (Prisma Record Not Found) and return `404 Not Found`.
- Intercept `P2002` (Duplicate Key) and return `409 Conflict`.
- Use global `BigInt.prototype.toJSON` mapping. Do **not** use manual `.toString()` on response IDs.
- Remove all `console.log`/`console.error` logs; return standardized JSON error objects.
- Ensure integration tests use the `prisma` singleton from `src/lib/prisma`.

## 2. Frontend Architecture

### Design Pattern
The frontend pattern follows a **Direct Replication (Approach 1)** strategy from `DailyActivitiesModule.tsx`. No shared custom hooks will be used to prioritize file isolation per AGENTS.md rules.

### UI/UX Updates
Applies to: `ProposalsModule.tsx`, `CsrProjectsModule.tsx`, `GrievanceModule.tsx`, `LrpModule.tsx`, `StakeholderModule.tsx`, `TopIssuesModule.tsx`.

1. **State Management:**
   - Introduce local state: `const [showDeleted, setShowDeleted] = useState(false);`.

2. **TopBar:**
   - Inject a checkbox toggle labeled **"Data Terhapus:"** into the `TopBar` children container.
   - Conditionally hide the standard **"Tambah"** (Add) button when `showDeleted === true`.

3. **Data Table Actions:**
   - Observe `showDeleted` within the table row renderer.
   - If `true`: Render only a green **"Restore"** action button.
   - If `false`: Render the standard Edit/Delete action buttons.

4. **Data Fetching:**
   - Update the module's `fetchData` effect to append `?is_deleted=${showDeleted}` to the GET request.
   - Re-fetch data automatically when `showDeleted` changes.

5. **Restoration Logic:**
   - Add `handleRestore(id: string)` handler.
   - Ask for confirmation via standard browser `confirm()`.
   - Execute `axios.patch` to the `/restore` endpoint.
   - Show success or cleanly extracted backend error via the existing `showToast` prop (`e.response?.data?.error`).

## 3. Testing & Verification
- **Backend:** Update Jest integration suites for all 3 backend modules to test `is_deleted=true` GET queries and the `PATCH` restore logic (including 404 error cases). All 15 suites must pass cleanly on `.env.test`.
- **Frontend:** Verify compilation cleanly via `npm run build` using Vite/tsc.
