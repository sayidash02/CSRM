# Design: Stakeholder 360 Feature Removal (Rollback)

## Overview
This document specifies the design for safely removing the Stakeholder 360 feature and reverting the system to its previous state. The goal is to eliminate the feature entirely without causing bugs or losing existing relationship data that was established while the feature was active.

## Architecture & Data Flow Reversion

### 1. Database Schema & Prisma
The central `stakeholders` table will be removed. All modules that were linked to this table will be reverted to use free-text fields instead of relational IDs.

Specifically:
- `daily_activities`: Restore the `institution_group` VARCHAR(255) column. Remove `stakeholder_id` and `stakeholder_engagement_id` columns.
- `stakeholder_engagement`: Restore the `stakeholder` VARCHAR(255) column. Remove the `stakeholder_id` column.
- `csr_projects`: Remove the `grievance_id` column.

### 2. Data Migration Strategy
Before the relational columns and tables are dropped, a one-time database migration script will run to copy data back. 
- For every record in `daily_activities` with a `stakeholder_id`, the script will look up the `name` from the `stakeholders` table and save it into `institution_group`.
- For every record in `stakeholder_engagement`, the script will save the stakeholder `name` into the `stakeholder` field.

### 3. Backend (API) Clean-up
- Delete the `StakeholderController`.
- Delete `stakeholder.routes.ts` and remove its registration in `app.ts`.
- Revert `DailyActivityController`, `StakeholderEngagementController`, and `CSRProjectController` so they process string text values rather than BIGINT IDs in their request payloads and Prisma queries.
- Update data validation schemas accordingly.

### 4. Frontend Clean-up
- Remove the `Stakeholder360.tsx` profile view and its corresponding routing.
- Remove API client files (`api/stakeholders.ts`) and React Query hooks (`hooks/useStakeholders.ts`).
- Revert the Searchable Combobox components in the `daily-activities`, `stakeholder-engagement`, and `csr-projects` forms back to simple Text Inputs.
- Remove any sidebar navigation links pointing to the Stakeholder 360 page.

## Testing & Safety
- **Data Preservation Validation**: The migration script will be tested against a local snapshot to ensure no data is lost during the conversion from relational to flat text.
- **Form Integrity**: Integration tests will verify that forms can successfully submit text values directly without depending on the stakeholder API.
