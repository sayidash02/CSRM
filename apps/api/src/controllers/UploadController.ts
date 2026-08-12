import { Request, Response } from 'express';
import { DocumentUploadService } from '../services/DocumentUploadService';
import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';
import { GraphSharePointClient } from '../services/sharepoint/GraphSharePointClient';
import { catchAsync } from '../lib/catchAsync';

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

export const uploadDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  const { activity_date, pic_name } = req.body;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  let activityDate = activity_date ? new Date(activity_date) : new Date();
  if (isNaN(activityDate.getTime())) {
    activityDate = new Date();
  }
  const finalPicName = pic_name || "System";

  const fileUrl = await uploadService.processAndUpload(
    file.buffer,
    file.originalname,
    file.mimetype,
    file.size,
    activityDate,
    finalPicName
  );

  res.status(200).json({ data: { url: fileUrl } });
});
