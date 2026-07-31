jest.mock('../src/services/sharepoint/GraphSharePointClient', () => {
  return {
    GraphSharePointClient: jest.fn().mockImplementation(() => {
      return {
        uploadFile: jest.fn().mockResolvedValue('https://mock-sharepoint.com/mock-file.xlsx'),
        createUploadSession: jest.fn().mockResolvedValue('https://mock-sharepoint.com/upload-session')
      };
    })
  };
});
