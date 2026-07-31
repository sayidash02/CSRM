import { Request, Response } from 'express';
import { DocumentUploadService } from '../services/DocumentUploadService';
import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';
import { GraphSharePointClient } from '../services/sharepoint/GraphSharePointClient';

// Decide which client to use based on env vars
let sharePointClient;
if (process.env.SHAREPOINT_CLIENT_ID && process.env.SHAREPOINT_CLIENT_SECRET && process.env.SHAREPOINT_TENANT_ID) {
  sharePointClient = new GraphSharePointClient(
    process.env.SHAREPOINT_TENANT_ID,
    process.env.SHAREPOINT_CLIENT_ID,
    process.env.SHAREPOINT_CLIENT_SECRET,
    process.env.SHAREPOINT_SITE_ID || '',
    process.env.SHAREPOINT_DRIVE_ID || ''
  );
} else {
  // Use mock if no credentials provided (for testing/development)
  sharePointClient = new MockSharePointClient();
}

const basePath = process.env.SHAREPOINT_BASE_PATH || '0. Testing';
const uploadService = new DocumentUploadService(sharePointClient, basePath);

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const { activity_date, pic_name } = req.body;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!activity_date || !pic_name) {
      res.status(400).json({ error: 'activity_date and pic_name are required' });
      return;
    }

    const activityDate = new Date(activity_date);
    if (isNaN(activityDate.getTime())) {
      res.status(400).json({ error: 'Invalid activity_date format' });
      return;
    }

    const fileUrl = await uploadService.processAndUpload(
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      activityDate,
      pic_name
    );

    res.status(200).json({ data: { url: fileUrl } });
  } catch (error: any) {
    console.error('Error in uploadDocument:', error);
    if (error.message && (error.message.includes('File size exceeds') || error.message.includes('File extension not allowed'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error during file upload' });
  }
};
