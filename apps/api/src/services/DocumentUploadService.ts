import { ISharePointClient } from './sharepoint/ISharePointClient';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class DocumentUploadService {
  private sharepointClient: ISharePointClient;
  private basePath: string;

  constructor(sharepointClient: ISharePointClient, basePath: string = '0. Testing') {
    this.sharepointClient = sharepointClient;
    this.basePath = basePath;
  }

  public async processAndUpload(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    fileSize: number,
    activityDate: Date,
    picName: string
  ): Promise<string> {
    this.validateFile(originalFileName, mimeType, fileSize);
    
    const targetFolder = this.calculateTargetFolder(activityDate);
    const safeFileName = this.generateSafeFileName(originalFileName, activityDate, picName);
    
    // Create the full path for SharePoint
    const fullPath = `${this.basePath}/${targetFolder}`;
    
    // Upload using the client (which abstracts Graph API / Mock)
    const fileUrl = await this.sharepointClient.uploadFile(fullPath, safeFileName, fileBuffer, fileSize);
    return fileUrl;
  }

  private validateFile(fileName: string, mimeType: string, fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 5MB limit: ${fileSize} bytes`);
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension not allowed: .${ext}`);
    }

    // Basic MIME type validation
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Sometimes octet-stream is sent, we rely on extension in those cases,
      // but ideally we check explicitly. Let's pass if extension is valid for simplicity.
    }
  }

  private calculateTargetFolder(date: Date): string {
    const year = date.getFullYear();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = monthNames[date.getMonth()];
    
    const day = date.getDate();
    let weekStr = '';
    if (day <= 7) weekStr = 'Week 1';
    else if (day <= 14) weekStr = 'Week 2';
    else if (day <= 21) weekStr = 'Week 3';
    else weekStr = 'Week 4';
    
    return `${year}/${month}/${weekStr}`;
  }

  private generateSafeFileName(originalFileName: string, date: Date, picName: string): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const timestamp = `${yyyy}${mm}${dd}`;

    const sanitize = (str: string) => {
      // Remove characters not allowed in SharePoint: # % & * : < > ? / \ { | }
      return str.replace(/[#%&*:<>?\\/\{|}]/g, '_').replace(/\s+/g, '_');
    };

    const safePic = sanitize(picName);
    const safeOriginalName = sanitize(originalFileName);

    return `${timestamp}_${safePic}_${safeOriginalName}`;
  }
}
