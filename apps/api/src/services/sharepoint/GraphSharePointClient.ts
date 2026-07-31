import { ISharePointClient } from './ISharePointClient';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { OneDriveLargeFileUploadTask, OneDriveLargeFileUploadOptions } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

export class GraphSharePointClient implements ISharePointClient {
  private graphClient: Client;
  private siteId: string;
  private driveId: string;

  constructor(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    siteId: string,
    driveId: string
  ) {
    this.siteId = siteId;
    this.driveId = driveId;

    const msalConfig = {
      auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret: clientSecret,
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const authResponse = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default']
          });
          done(null, authResponse?.accessToken || '');
        } catch (error) {
          done(error as any, null);
        }
      }
    });
  }

  public async uploadFile(path: string, fileName: string, fileBuffer: Buffer, fileSize: number): Promise<string> {
    try {
      // 1. Create upload session
      // Graph API path: /drives/{drive-id}/root:/{item-path}:/createUploadSession
      const fileUrlPath = `${path}/${fileName}`;
      const uploadSession = await this.graphClient
        .api(`/drives/${this.driveId}/root:/${encodeURIComponent(fileUrlPath)}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
            name: fileName
          }
        });

      // 2. Upload the file in chunks using OneDriveLargeFileUploadTask
      const options: OneDriveLargeFileUploadOptions = {
        rangeSize: 327680, // 320 KB chunk size (must be a multiple of 320 KB)
      };

      // Wrap the buffer in an object with a slice method that returns an ArrayBuffer or Buffer
      // LargeFileUploadTask expects a FileObject (which can be a Buffer in Node)
      const fileObject = fileBuffer;

      const uploadTask = new OneDriveLargeFileUploadTask(this.graphClient, fileObject, uploadSession);
      const uploadResult = await uploadTask.upload();

      // Return the web URL of the uploaded file
      return uploadResult.responseBody.webUrl;
    } catch (error) {
      console.error('Error uploading file to SharePoint:', error);
      throw new Error('Failed to upload file to SharePoint');
    }
  }
}
