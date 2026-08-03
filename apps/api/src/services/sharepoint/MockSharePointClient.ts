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
