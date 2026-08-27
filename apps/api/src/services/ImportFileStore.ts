import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const IMPORT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/crms-imports');
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

type StoredImport = { filePath: string; expiresAt: number };

export class ImportFileStore {
  private readonly entries = new Map<string, StoredImport>();
  private readonly rootDirectory: string;
  private readonly ttlMs: number;

  public constructor(
    rootDirectory: string = IMPORT_UPLOAD_DIR,
    ttlMs: number = 30 * 60 * 1000,
  ) {
    this.rootDirectory = path.resolve(rootDirectory);
    this.ttlMs = ttlMs;
    fs.mkdirSync(this.rootDirectory, { recursive: true });
  }

  public register(filePath: string, now = Date.now()): string {
    this.purgeExpired(now);
    const resolvedFile = this.assertInsideRoot(filePath);
    const token = randomBytes(32).toString('hex');
    this.entries.set(token, { filePath: resolvedFile, expiresAt: now + this.ttlMs });
    return token;
  }

  public take(token: string, now = Date.now()): string | null {
    this.purgeExpired(now);
    if (!TOKEN_PATTERN.test(token)) return null;

    const entry = this.entries.get(token);
    if (!entry || entry.expiresAt <= now) {
      this.entries.delete(token);
      return null;
    }

    this.entries.delete(token);
    return this.assertInsideRoot(entry.filePath);
  }

  public removeFile(filePath: string): void {
    const resolvedFile = this.assertInsideRoot(filePath);
    try {
      fs.unlinkSync(resolvedFile);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private purgeExpired(now: number): void {
    for (const [token, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(token);
        this.removeFile(entry.filePath);
      }
    }
  }

  private assertInsideRoot(filePath: string): string {
    const resolvedFile = path.resolve(filePath);
    const relativePath = path.relative(this.rootDirectory, resolvedFile);
    const isOutsideRoot =
      relativePath === '' ||
      relativePath === '..' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath);

    if (isOutsideRoot) {
      throw new Error('Import file must remain inside the import directory');
    }

    return resolvedFile;
  }
}

export const importFileStore = new ImportFileStore();
