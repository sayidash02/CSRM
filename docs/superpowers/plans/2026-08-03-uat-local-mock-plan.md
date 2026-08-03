# UAT Local Mock SharePoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement local file mocking for SharePoint to enable User Acceptance Testing (UAT) without real credentials.

**Tech Stack:** Node.js (`fs.promises`), Express, TypeScript.

---

### Task 1: Update MockSharePointClient

**Files:**
- Modify: `apps/api/src/services/sharepoint/MockSharePointClient.ts`

- [ ] **Step 1: Implement local file saving**
  Replace the existing dummy upload method with actual `fs` file operations.
  ```typescript
  import { ISharePointClient } from './ISharePointClient';
  import fs from 'fs/promises';
  import path from 'path';

  export class MockSharePointClient implements ISharePointClient {
    public async uploadFile(targetPath: string, fileName: string, fileBuffer: Buffer, fileSize: number): Promise<string> {
      // Create local mock directory in apps/api/.sharepoint_mock
      const baseMockDir = path.resolve(process.cwd(), '.sharepoint_mock');
      const fullDirPath = path.join(baseMockDir, targetPath);
      
      // Ensure the directory exists
      await fs.mkdir(fullDirPath, { recursive: true });
      
      const fullFilePath = path.join(fullDirPath, fileName);
      
      // Write the buffer to disk
      await fs.writeFile(fullFilePath, fileBuffer);
      console.log(`[MockSharePoint] File written successfully to ${fullFilePath}`);
      
      // Return absolute path so user can find it
      return `file://${fullFilePath.replace(/\\/g, '/')}`;
    }
  }
  ```
- [ ] **Step 2: Commit**
  ```bash
  git add apps/api/src/services/sharepoint/MockSharePointClient.ts
  git commit -m "feat(api): implement local file save in MockSharePointClient"
  ```

### Task 2: Inject Mock in Controller

**Files:**
- Modify: `apps/api/src/controllers/SyncController.ts`

- [ ] **Step 1: Replace GraphSharePointClient with MockSharePointClient**
  Change the imports and instantiation in `SyncController.ts`:
  ```typescript
  import { Request, Response } from 'express';
  import prisma from '../lib/prisma';
  import { SyncService } from '../services/SyncService';
  import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';

  const sharePointClient = new MockSharePointClient();
  const syncService = new SyncService(sharePointClient);
  ```
- [ ] **Step 2: Commit**
  ```bash
  git add apps/api/src/controllers/SyncController.ts
  git commit -m "refactor(api): inject MockSharePointClient into SyncController for UAT"
  ```

### Task 3: Backend Verification

- [ ] **Step 1: Typecheck**
  Run `npx tsc --noEmit` inside `apps/api` to ensure no TypeScript compilation errors exist.
