# Design: Remove Stakeholder Engagement Dropdown from Daily Activities Form

## Overview
This specification details the removal of the optional "Stakeholder Engagement" dropdown field from the Daily Activities form in the frontend UI (`DailyActivitiesModule.tsx`).

## Scope of Changes

### 1. Frontend Form Component (`DailyActivitiesModule.tsx`)
- Remove the `<Field label="Stakeholder Engagement (Opsional)">` JSX block containing the `<select>` input.
- Remove `stakeholder_engagement_id` from initial form state defaults, form reset logic, and save/submit payload preparation.
- Remove any unused queries or helpers that fetched engagement lists solely for populating this dropdown.

### 2. Backward Compatibility
- No changes to backend API or database are required as part of this UI cleanup. The backend already handles `daily_activities` payloads without requiring `stakeholder_engagement_id`.

## Testing
- Verify that adding a new activity succeeds without errors.
- Verify that editing an existing activity succeeds without errors.
- Ensure TypeScript compilation (`pnpm exec tsc --noEmit`) passes with zero errors.
