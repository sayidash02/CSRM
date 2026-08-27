-- AlterTable
ALTER TABLE daily_activities ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE stakeholder_engagement ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE top_issues ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE proposals ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE csr_projects ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE grievance ADD COLUMN sharepoint_links JSON NULL;

-- AlterTable
ALTER TABLE lrp ADD COLUMN sharepoint_links JSON NULL;
