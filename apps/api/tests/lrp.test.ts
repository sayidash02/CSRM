import { Request, Response } from 'express';
import { createLrp, getLrps, updateLrp, deleteLrp, restoreLrp } from '../src/controllers/LrpController';
import prisma from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    lrp: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('LrpController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe('createLrp', () => {
    it('should create a new lrp (Pos)', async () => {
      req.body = { program: 'Program 1', sharepoint_link: 'http://link.com', year: 2026 };
      const mockResult = { id: 1n, program: 'Program 1', sharepoint_link: 'http://link.com', year: 2026 };
      (prisma.lrp.create as jest.Mock).mockResolvedValue(mockResult);

      await createLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });

    it('should return 400 if missing required fields (Neg)', async () => {
      req.body = { program: 'Program 1' }; // missing sharepoint_link
      
      await createLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should handle internal server error (Neg)', async () => {
      req.body = { program: 'Program 1', sharepoint_link: 'http://link.com', year: 2026 };
      (prisma.lrp.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await createLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getLrps', () => {
    it('should return all active lrps', async () => {
      const mockResult = [{ id: 1n, program: 'Program 1', sharepoint_link: 'http://link.com', is_deleted: false }];
      (prisma.lrp.findMany as jest.Mock).mockResolvedValue(mockResult);

      await getLrps(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });

    it('GET /api/lrp?is_deleted=true (status 200)', async () => {
      req.query = { is_deleted: 'true' };
      const mockResult = [{ id: 1n, program: 'Program 1', sharepoint_link: 'http://link.com', is_deleted: true }];
      (prisma.lrp.findMany as jest.Mock).mockResolvedValue(mockResult);

      await getLrps(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(prisma.lrp.findMany).toHaveBeenCalledWith({
        where: { is_deleted: true, is_archived: false }
      });
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('updateLrp', () => {
    it('should update an existing lrp', async () => {
      req.params = { id: '1' };
      req.body = { program: 'Program Updated', sharepoint_link: 'http://link-updated.com' };
      const mockResult = { id: 1n, program: 'Program Updated', sharepoint_link: 'http://link-updated.com' };
      (prisma.lrp.update as jest.Mock).mockResolvedValue(mockResult);

      await updateLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('deleteLrp', () => {
    it('should soft delete an lrp', async () => {
      req.params = { id: '1' };
      const mockResult = { id: 1n, is_deleted: true };
      (prisma.lrp.update as jest.Mock).mockResolvedValue(mockResult);

      await deleteLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('restoreLrp', () => {
    it('should restore a soft deleted lrp', async () => {
      req.params = { id: '1' };
      const mockResult = { id: 1n, is_deleted: false };
      (prisma.lrp.update as jest.Mock).mockResolvedValue(mockResult);

      await restoreLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockResult });
    });

    it('PATCH /api/lrp/999999/restore (status 404)', async () => {
      req.params = { id: '999999' };
      (prisma.lrp.update as jest.Mock).mockRejectedValue({ code: 'P2025' });

      await restoreLrp(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'LRP record not found' });
    });
  });
});
