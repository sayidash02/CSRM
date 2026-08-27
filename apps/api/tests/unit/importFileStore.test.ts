import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ImportFileStore } from '../../src/services/ImportFileStore';

describe('ImportFileStore', () => {
  it('returns a token instead of exposing the uploaded filesystem path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-import-store-test-'));
    const filePath = path.join(root, 'upload.xlsx');
    fs.writeFileSync(filePath, 'test');
    const store = new ImportFileStore(root, 60_000);

    const token = store.register(filePath);

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toContain(root);
    expect(store.take(token)).toBe(filePath);
  });

  it('rejects a path outside the import root and consumes tokens once', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-import-store-test-'));
    const outsidePath = path.join(path.dirname(root), `${path.basename(root)}-outside.xlsx`);
    fs.writeFileSync(outsidePath, 'outside');
    const store = new ImportFileStore(root, 60_000);

    expect(() => store.register(outsidePath)).toThrow(/import directory/i);
    expect(store.take('a'.repeat(64))).toBeNull();
  });

  it('never deletes a file outside the import root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-import-store-test-'));
    const outsidePath = path.join(path.dirname(root), `${path.basename(root)}-outside.xlsx`);
    fs.writeFileSync(outsidePath, 'outside');
    const store = new ImportFileStore(root, 60_000);

    expect(() => store.removeFile(outsidePath)).toThrow(/import directory/i);
    expect(fs.existsSync(outsidePath)).toBe(true);
  });

  it('rejects the import root itself as a file path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-import-store-test-'));
    const store = new ImportFileStore(root, 60_000);

    expect(() => store.register(root)).toThrow(/import directory/i);
  });

  it('expires abandoned tokens', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-import-store-test-'));
    const filePath = path.join(root, 'upload.xlsx');
    fs.writeFileSync(filePath, 'test');
    const store = new ImportFileStore(root, 0);
    const token = store.register(filePath);

    expect(store.take(token)).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
