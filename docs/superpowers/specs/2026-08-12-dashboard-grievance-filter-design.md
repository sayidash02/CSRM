# Dashboard High Priority Grievance Filter Design

## Context
In the Dashboard Overview, the "Grievance Prioritas" (High Priority Grievances) box currently displays grievances without filtering out those that have already been resolved or closed. As a result, critical issues that have already been handled still appear as active warnings.

## Objective
Filter the "Grievance Prioritas" list so that only active, unresolved high-significance grievances are displayed on the dashboard.

## Proposed Changes
1. **Update Backend Query:** In `DashboardController.ts`, update the Prisma query for fetching `highPriorityGrievances`.
2. **Filter Conditions:** 
   - Exclude deleted items (`is_deleted: false`).
   - Include only high significance (`significance: { in: ['High', 'Critical'] }`).
   - Include only active statuses (`status: { in: ['Open', 'On Progress'] }`).
3. **Data Mapping:** Ensure the fetched raw database rows are correctly mapped to match the frontend expectations (`regNo` instead of `register_no`, `name` instead of `complainant_name`) before returning the JSON response.

## Impact
- **Affected File:** `apps/api/src/controllers/DashboardController.ts`
- **Visual Impact:** Closed or Resolved grievances will no longer clutter the Dashboard Overview.
- **Data Impact:** The API endpoint `/api/dashboard/stats` will return a properly filtered and mapped `highPriorityGrievances` array.
