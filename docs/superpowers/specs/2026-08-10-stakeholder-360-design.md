# Stakeholder 360° and Module Relations Design

## Context
In the current Excel-based workflow, data across 7 modules (Daily Activities, Stakeholder Engagement, CSR Projects, Grievances, etc.) are isolated. 
The user wants to establish explicit relationships between modules (e.g., linking a Daily Activity to a Stakeholder Engagement record, or a Grievance to a CSR Project) and view a unified summary of all interactions per stakeholder ("Stakeholder 360°").

## Architecture & Database Changes
1. **Master Stakeholder Table (`stakeholders`)**
   - Similar to the existing `pics` lookup table.
   - Allows self-service creation (users can add new stakeholders on the fly).
   - Replaces free-text fields in `daily_activities` (`institution_group`) and `stakeholder_engagement` (`stakeholder`), and potentially others (e.g., `complainant_name` in `grievance`).

2. **Explicit Link Columns**
   - `daily_activities`: Add `stakeholder_engagement_id` (nullable foreign key) to explicitly link an activity to an engagement event.
   - `csr_projects`: Add `grievance_id` (nullable foreign key) to link a project back to the grievance that initiated it.

3. **Export Compatibility**
   - The "Export & Sync" function will join the `stakeholders` table so the generated Excel continues to display the text names, ensuring the exported files exactly match the original structure.

## UI & User Flow
1. **Form Input Updates**
   - Stakeholder fields become searchable comboboxes. If a stakeholder doesn't exist, an "Add New" button appears inside the dropdown.
   - Explicit relation fields (e.g. "Terkait Grievance yang mana?") are added as optional searchable dropdowns.

2. **Master Stakeholders Menu**
   - A new sidebar menu item listing all registered stakeholders.

3. **Stakeholder 360° Profile Page**
   - Clicking a stakeholder name opens a dedicated profile page.
   - **Header:** Displays KPI/Summary counts (e.g., Total Activities: 12 | Total Issues: 2 | Total Grievances: 1).
   - **Tabs:** Multiple tabs for each related module (Daily Activities, Stakeholder Engagement, CSR Projects, Grievances) listing the actual records related to this stakeholder.

## Scope & Constraints
- Only specific modules that share the concept of an "Institution" or "Complainant" will be linked to the new Stakeholder master data.
- The UI will reuse existing table components for the tabs inside the 360° profile to ensure visual consistency and development speed.
