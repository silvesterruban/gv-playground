import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminController } from '../controllers/adminController';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../config/prisma', () => ({
  prisma: {
    schoolVerification: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

// Mock email service
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

// Mock config
jest.mock('../config', () => ({
  config: {
    email: {
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user',
          pass: 'pass'
        }
      },
      from: 'noreply@example.com'
    },
    paypal: { clientId: '', clientSecret: '', environment: '' }
  }
}));

describe('AdminController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
  };
  let prismaMock: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      params: {},
      body: {},
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
      acceptsEncodings: jest.fn(),
      acceptsLanguages: jest.fn(),
      range: jest.fn(),
      param: jest.fn(),
      is: jest.fn(),
      protocol: 'http',
      secure: false,
      ip: '127.0.0.1',
      ips: [],
      subdomains: [],
      path: '/',
      hostname: 'localhost',
      host: 'localhost:3000',
      fresh: false,
      stale: true,
      xhr: false,
      cookies: {},
      signedCookies: {},
      method: 'GET',
      url: '/',
      originalUrl: '/',
      baseUrl: '',
      route: undefined
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup Prisma mock
    prismaMock = {
      schoolVerification: {
        findUnique: jest.fn(),
        update: jest.fn()
      }
    };

    // Mock the PrismaClient constructor
    (PrismaClient as jest.Mock).mockImplementation(() => prismaMock);

    // Set the mock on the global prisma instance
    (global as any).prisma = prismaMock;
  });

  describe('reviewSchoolVerification', () => {
    beforeEach(() => {
      mockRequest = {
        ...mockRequest,
        user: { userType: 'admin' }
      };
    });

    it('should approve verification successfully', async () => {
      console.log('Test: Starting approve verification test');
      
      const mockVerification = {
        id: 'verification-1',
        status: 'pending',
        verificationEmail: 'test@example.com'
      };

      const { prisma } = require('../config/prisma');
      console.log('Test: Setting up prisma mock');
      (prisma.schoolVerification.update as jest.Mock).mockResolvedValue({
        ...mockVerification,
        status: 'verified'
      });

      mockRequest.body = {
        verificationId: 'verification-1',
        status: 'verified'
      };
      console.log('Test: Request body:', mockRequest.body);

      try {
        await AdminController.reviewSchoolVerification(mockRequest as Request, mockResponse as Response);
        console.log('Test: Controller response:', mockResponse.json.mock.calls[0][0]);
      } catch (error) {
        console.error('Test: Error in controller:', error);
      }

      expect(prisma.schoolVerification.update).toHaveBeenCalledWith({
        where: { id: 'verification-1' },
        data: {
          status: 'verified',
          rejectionReason: undefined
        }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'School verification reviewed successfully',
        data: {
          verification: {
            ...mockVerification,
            status: 'verified'
          }
        }
      });
    });

    it('should reject verification successfully', async () => {
      console.log('Test: Starting reject verification test');
      
      const mockVerification = {
        id: 'verification-1',
        status: 'pending',
        verificationEmail: 'test@example.com'
      };

      const { prisma } = require('../config/prisma');
      console.log('Test: Setting up prisma mock');
      (prisma.schoolVerification.update as jest.Mock).mockResolvedValue({
        ...mockVerification,
        status: 'rejected'
      });

      mockRequest.body = {
        verificationId: 'verification-1',
        status: 'rejected',
        rejectionReason: 'Invalid document'
      };
      console.log('Test: Request body:', mockRequest.body);

      try {
        await AdminController.reviewSchoolVerification(mockRequest as Request, mockResponse as Response);
        console.log('Test: Controller response:', mockResponse.json.mock.calls[0][0]);
      } catch (error) {
        console.error('Test: Error in controller:', error);
      }

      expect(prisma.schoolVerification.update).toHaveBeenCalledWith({
        where: { id: 'verification-1' },
        data: {
          status: 'rejected',
          rejectionReason: 'Invalid document'
        }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'School verification reviewed successfully',
        data: {
          verification: {
            ...mockVerification,
            status: 'rejected'
          }
        }
      });
    });

    it('should handle non-existent verification', async () => {
      console.log('Test: Starting non-existent verification test');
      
      const { prisma } = require('../config/prisma');
      console.log('Test: Setting up prisma mock');
      (prisma.schoolVerification.update as jest.Mock).mockRejectedValue(new Error('Record not found'));

      mockRequest.body = {
        verificationId: 'non-existent',
        status: 'verified'
      };
      console.log('Test: Request body:', mockRequest.body);

      try {
        await AdminController.reviewSchoolVerification(mockRequest as Request, mockResponse as Response);
        console.log('Test: Controller response:', mockResponse.json.mock.calls[0][0]);
      } catch (error) {
        console.error('Test: Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
}); 