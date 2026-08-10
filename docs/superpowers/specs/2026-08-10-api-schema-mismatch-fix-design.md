# Backend Schema Mismatch Fix Design

## 1. Context & Purpose
The API application currently contains multiple TypeScript compilation errors and test failures because the controllers, services, and tests assume a many-to-many relationship between `daily_activities` and `pics` via a junction table `daily_activity_pics`. 

However, according to the ultimate source of truth (`schema.sql` at the project root), the relationship is strictly one-to-many: the `daily_activities` table contains a single `pic_id` column.

The purpose of this fix is to align the API codebase with the source of truth schema.

## 2. Scope of Changes
This design strictly covers refactoring the Node.js/Express API codebase (`apps/api`) to use the single `pic_id` relation.

### 2.1. Controllers
**`DailyActivitiesController.ts`**
- **Read Operations (`getDailyActivities`, `getDailyActivityById`)**: Update the Prisma `.findMany()` and `.findUnique()` query `include` statements. Remove `daily_activity_pics` and replace it with `pic: true`.
- **Write Operations (`createDailyActivity`, `updateDailyActivity`)**: 
  - Ensure the parsed request body uses a single `pic_id` (expected as a `string` or `number`, cast to `BigInt`).
  - Remove logic that inserts into the `daily_activity_pics` junction. Replace it with a direct `pic_id` assignment in the `data` payload of `prisma.daily_activities.create()` and `prisma.daily_activities.update()`.

### 2.2. Services
**`ExcelImportService.ts`**
- In the data mapping phase (around `daily_activity_pics`), adjust the logic that associates a parsed PIC with the activity. It should assign the matched `pic_id` directly to the new `daily_activities` record instead of creating related junction records.

**`SyncService.ts`**
- Update the Prisma query that fetches data for synchronization to include `pic` instead of `daily_activity_pics`.

### 2.3. Test Suite
- **`tests/dailyActivities.test.ts`**: Update the mock payload for `POST` and `PUT` endpoints to provide a `pic_id` instead of a list of PICs.
- **`tests/integration/ExcelImportService.test.ts`**: Update the expected shape of `validRows`. It should assert that `pic_id` is set correctly.
- **`tests/pics.test.ts`**: Fix any leftover assertions querying the Prisma client for `daily_activity_pics`.
- **`DocumentUploadService.test.ts`**: Fix the mock SharePoint assertions which expect the substring "mocksharepoint" but receive a `file://C:/...` URI. The URL formatting logic in the mock client or test expectations will be aligned.

## 3. Architecture & Data Flow
- Incoming Request -> Controller (Validates single `pic_id`) -> Prisma Client (Creates/Updates `daily_activities` with `pic_id`) -> Database.
- The returned JSON response will map the single `pic` object directly onto the activity representation.

## 4. Error Handling
- The controllers will validate that the `pic_id` exists before creating or updating an activity, returning a `400 Bad Request` or catching a Prisma `P2025` error to return `404 Not Found` if the PIC is invalid.

## 5. Security & Safety
- Standard parametrized ORM queries via Prisma are maintained to prevent SQL injection.
- Typescript strict checks will ensure that all fields passed to Prisma match the `schema.prisma`.
