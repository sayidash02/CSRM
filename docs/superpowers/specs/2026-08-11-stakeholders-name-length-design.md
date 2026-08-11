# Design: Increase Stakeholders Name Limit

## Context
When importing data from the `CRS(Isi).xlsx` file, the `ExcelImportService` dynamically extracts and creates master stakeholders. Some of the raw values extracted from the `institution_group` or `stakeholder` columns exceed the current 100-character database limit for the `stakeholders.name` column, causing a `PrismaClientKnownRequestError` (`The provided value for the column is too long for the column's type`).

## Proposed Solution
We will increase the maximum character limit for the `stakeholders.name` column from 100 to 255. This will comfortably accommodate long stakeholder names (such as verbose government agency department names) without data loss or truncation.

## Architecture & Data Flow
No changes to the architecture or data flow.

## Database Changes
1. **Raw SQL Schema (`schema.sql`)**: 
   - Update `CREATE TABLE stakeholders` to define `name VARCHAR(255) NOT NULL UNIQUE`.
2. **Prisma Schema (`apps/api/prisma/schema.prisma`)**: 
   - Update the `stakeholders` model so that `name String @unique @db.VarChar(255)`.

## Error Handling
The `ExcelImportService` already correctly truncates standard fields dynamically, but `stakeholders.name` is a master record. We will also update the `ExcelImportService` to ensure any value passed to `stakeholder.name` is softly truncated to 255 characters (`truncStr(..., 255)`) just in case a record exceeds even the new 255 limit, preventing unhandled Prisma crashes in the future.

## Testing
- Integration tests will be run (`npm run test` in `apps/api`) to ensure Prisma logic stays perfectly aligned and no `createMany` regressions occur.
- A manual import of the `CRS(Isi).xlsx` file can be executed after applying the change to verify the fix in production.
