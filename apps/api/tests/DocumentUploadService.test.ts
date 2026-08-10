import { DocumentUploadService } from '../src/services/DocumentUploadService';
import { MockSharePointClient } from '../src/services/sharepoint/MockSharePointClient';

describe('DocumentUploadService', () => {
  let uploadService: DocumentUploadService;
  let mockClient: MockSharePointClient;

  beforeEach(() => {
    mockClient = new MockSharePointClient();
    uploadService = new DocumentUploadService(mockClient, '0. Testing');
  });

  describe('Validation', () => {
    it('Should reject file size > 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      await expect(
        uploadService.processAndUpload(largeBuffer, 'test.pdf', 'application/pdf', largeBuffer.length, new Date(), 'Ziya')
      ).rejects.toThrow('File size exceeds 5MB limit');
    });

    it('Should reject invalid extension', async () => {
      const buffer = Buffer.alloc(1024);
      await expect(
        uploadService.processAndUpload(buffer, 'test.exe', 'application/x-msdownload', buffer.length, new Date(), 'Ziya')
      ).rejects.toThrow('File extension not allowed');
    });

    it('Should accept valid file', async () => {
      const buffer = Buffer.alloc(1024);
      const url = await uploadService.processAndUpload(buffer, 'test.pdf', 'application/pdf', buffer.length, new Date('2026-08-05'), 'Ziya');
      expect(url).toMatch(/^file:\/\//);
    });
  });

  describe('Folder & Filename Calculation', () => {
    it('Should correctly format Week 1 and sanitize filename', async () => {
      const uploadSpy = jest.spyOn(mockClient, 'uploadFile');
      const buffer = Buffer.alloc(1024);
      const activityDate = new Date('2026-08-05T00:00:00Z'); // Tanggal 5 = Week 1
      
      await uploadService.processAndUpload(buffer, 'my file.pdf', 'application/pdf', buffer.length, activityDate, 'Ziya & Adji');
      
      expect(uploadSpy).toHaveBeenCalledWith(
        '0. Testing/2026/Agustus/Week 1',
        '20260805_Ziya___Adji_my_file.pdf',
        buffer,
        1024
      );
    });

    it('Should correctly format Week 4 for end of month', async () => {
      const uploadSpy = jest.spyOn(mockClient, 'uploadFile');
      const buffer = Buffer.alloc(1024);
      const activityDate = new Date('2026-08-25T00:00:00Z'); // Tanggal 25 = Week 4
      
      await uploadService.processAndUpload(buffer, 'report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer.length, activityDate, 'Sasha');
      
      expect(uploadSpy).toHaveBeenCalledWith(
        '0. Testing/2026/Agustus/Week 4',
        '20260825_Sasha_report.docx',
        buffer,
        1024
      );
    });
  });
});
