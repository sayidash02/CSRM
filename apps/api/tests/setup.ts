// Global setup for all Jest tests
jest.mock('../src/services/sharepoint/GraphSharePointClient', () => {
  return {
    GraphSharePointClient: jest.fn().mockImplementation(() => {
      return {
        uploadFile: jest.fn().mockResolvedValue('https://mock-sharepoint.com/mock-file.xlsx')
      };
    })
  };
});
