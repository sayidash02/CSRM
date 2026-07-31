import { ISharePointClient } from './ISharePointClient';

export class MockSharePointClient implements ISharePointClient {
  public async uploadFile(path: string, fileName: string, fileBuffer: Buffer, fileSize: number): Promise<string> {
    console.log(`[MockSharePoint] Uploading ${fileName} (${fileSize} bytes) to ${path}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Return a fake URL
    return `https://mocksharepoint.com/02.06%20Community%20Relations/${encodeURIComponent(path)}/${encodeURIComponent(fileName)}`;
  }
}
