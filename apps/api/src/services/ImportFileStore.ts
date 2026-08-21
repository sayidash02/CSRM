import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const IMPORT_UPLOAD_DIR = path.resolve(os.tmpdir(), 'crms-imports');
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

type StoredImport = { filePath: string; expiresAt: number };

export class ImportFileStore {
  private readonly entries = new Map<string, StoredImport>();

  public constructor(
    private readonly rootDirectory: string = IMPORT_UPLOAD_DIR,
    private readonly ttlMs: number = 30 * 60 * 1000,
  ) {
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
      if (entry.expiresAt <= now) this.entries.delete(token);
    }
  }

  private assertInsideRoot(filePath: string): string {
    const root = path.resolve(this.rootDirectory);
    const resolvedFile = path.resolve(filePath);
    const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (!resolvedFile.startsWith(rootWithSeparator)) {
      throw new Error('Import file must remain inside the import directory');
    }
    return resolvedFile;
  }
}

export const importFileStore = new ImportFileStore();
