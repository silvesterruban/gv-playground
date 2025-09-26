// Create a shared mock Prisma instance and mock before any imports
const createPrismaDelegateMock = () => ({
  findUnique: jest.fn(),
  findUniqueOrThrow: jest.fn(),
  findFirst: jest.fn(),
  findFirstOrThrow: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
  upsert: jest.fn(),
});

// Shared prismaMock instance
const prismaMock = {
  student: createPrismaDelegateMock(),
  school: createPrismaDelegateMock(),
  schoolVerification: createPrismaDelegateMock(),
  welcomeBox: createPrismaDelegateMock(),
  $transaction: jest.fn((callback) => callback()),
} as unknown as jest.Mocked<PrismaClient>;

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => prismaMock),
  };
});

// Mock email service
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StudentController } from '../controllers/studentController';
import { JWTUtils } from '../utils/jwtUtils';
import { StripeService } from '../services/payment/stripeService';
import { sendEmail } from '../utils/emailService';

// Mock JWTUtils
jest.mock('../utils/jwtUtils', () => ({
  JWTUtils: {
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

// Mock StripeService
jest.mock('../services/stripeService', () => ({
  StripeService: {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
  },
}));

describe('StudentController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    console.log('\n=== Setting up test environment ===');
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

    console.log('Test environment setup complete\n');
  });

  describe('verifySchool', () => {
    beforeEach(() => {
      console.log('\n=== Setting up verifySchool test ===');
      mockRequest = {
        ...mockRequest,
        user: { id: 'student-1' }
      };
      console.log('Mock request user:', mockRequest.user);
    });

    it('should submit verification successfully', async () => {
      console.log('\nTest: Starting submit verification test');
      
      const mockStudent = {
        id: 'student-1',
        schoolId: 'school-1'
      };
      console.log('Mock student:', mockStudent);

      const mockSchool = {
        id: 'school-1',
        verificationMethods: ['email']
      };
      console.log('Mock school:', mockSchool);

      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prismaMock.school.findUnique as jest.Mock).mockResolvedValue(mockSchool);
      (prismaMock.schoolVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.schoolVerification.create as jest.Mock).mockResolvedValue({
        id: 'verification-1',
        status: 'pending'
      });
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        schoolId: 'school-1',
        verificationMethod: 'email',
        verificationEmail: 'test@example.com'
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling verifySchool controller...');
        await StudentController.verifySchool(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'School verification request submitted successfully',
        data: {
          id: 'verification-1',
          status: 'pending'
        }
      });
    });

    it('should handle non-existent school', async () => {
      console.log('\nTest: Starting non-existent school test');
      
      const mockStudent = {
        id: 'student-1',
        schoolId: 'non-existent'
      };
      console.log('Mock student:', mockStudent);

      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prismaMock.school.findUnique as jest.Mock).mockResolvedValue(null);
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        schoolId: 'non-existent',
        verificationMethod: 'email',
        verificationEmail: 'test@example.com'
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling verifySchool controller...');
        await StudentController.verifySchool(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'School not found'
      });
    });

    it('should handle unsupported verification method', async () => {
      console.log('\nTest: Starting unsupported method test');
      
      const mockStudent = {
        id: 'student-1',
        schoolId: 'school-1'
      };
      console.log('Mock student:', mockStudent);

      const mockSchool = {
        id: 'school-1',
        verificationMethods: ['email']
      };
      console.log('Mock school:', mockSchool);

      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prismaMock.school.findUnique as jest.Mock).mockResolvedValue(mockSchool);
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        schoolId: 'school-1',
        verificationMethod: 'unsupported',
        verificationEmail: 'test@example.com'
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling verifySchool controller...');
        await StudentController.verifySchool(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Verification method not supported by school'
      });
    });
  });

  describe('processRegistrationFee', () => {
    it('should create payment intent for registration fee successfully', async () => {
      console.log('\nTest: Starting process registration fee test');
      
      const mockPaymentIntent = {
        id: 'pi_test',
        clientSecret: 'secret_test'
      };
      console.log('Mock payment intent:', mockPaymentIntent);

      (StripeService.createPaymentIntent as jest.Mock).mockResolvedValue(mockPaymentIntent);
      console.log('Stripe service mock setup complete');

      mockRequest.body = {
        paymentMethodId: 'pm_test'
      };
      mockRequest.user = { id: 'test-student-id' };
      console.log('Request body:', mockRequest.body);
      console.log('Request user:', mockRequest.user);

      try {
        console.log('Calling processRegistrationFee controller...');
        await StudentController.processRegistrationFee(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(StripeService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 2500,
        currency: 'usd',
        paymentMethodId: 'pm_test',
        metadata: {
          purpose: 'registration_fee',
          studentId: 'test-student-id'
        }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          paymentIntentId: 'pi_test',
          clientSecret: 'secret_test'
        }
      });
    });
  });

  describe('confirmRegistrationFee', () => {
    it('should confirm payment and update student status on successful payment', async () => {
      console.log('\nTest: Starting confirm registration fee test');
      
      const mockPayment = {
        id: 'pi_test',
        status: 'succeeded'
      };
      console.log('Mock payment:', mockPayment);

      console.log('Setting up prisma mocks...');
      (StripeService.confirmPayment as jest.Mock).mockResolvedValue(mockPayment);
      (prismaMock.student.update as jest.Mock).mockResolvedValue({
        id: 'test-student-id',
        registrationPaid: true
      });
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        paymentIntentId: 'pi_test'
      };
      mockRequest.user = { id: 'test-student-id' };
      console.log('Request body:', mockRequest.body);
      console.log('Request user:', mockRequest.user);

      try {
        console.log('Calling confirmRegistrationFee controller...');
        await StudentController.confirmRegistrationFee(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(StripeService.confirmPayment).toHaveBeenCalledWith('pi_test');
      expect(prismaMock.student.update).toHaveBeenCalledWith({
        where: { id: 'test-student-id' },
        data: { registrationPaid: true }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Registration fee payment confirmed',
        data: {
          id: 'test-student-id',
          registrationPaid: true
        }
      });
    });
  });

  describe('requestWelcomeBox', () => {
    beforeEach(() => {
      console.log('\n=== Setting up requestWelcomeBox test ===');
      mockRequest = {
        ...mockRequest,
        user: { id: 'student-1' }
      };
      console.log('Mock request user:', mockRequest.user);
    });

    it('should submit welcome box request successfully', async () => {
      console.log('\nTest: Starting welcome box request test');
      
      const mockStudent = {
        id: 'student-1',
        registrationPaid: true
      };
      console.log('Mock student:', mockStudent);

      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prismaMock.welcomeBox.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.welcomeBox.create as jest.Mock).mockResolvedValue({
        id: 'welcome-box-1',
        status: 'pending'
      });
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        shippingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        }
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling requestWelcomeBox controller...');
        await StudentController.requestWelcomeBox(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Welcome box request submitted successfully',
        data: {
          id: 'welcome-box-1',
          status: 'pending'
        }
      });
    });

    it('should handle non-existent student', async () => {
      console.log('\nTest: Starting non-existent student test');
      
      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(null);
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        shippingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        }
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling requestWelcomeBox controller...');
        await StudentController.requestWelcomeBox(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Registration fee must be paid before requesting welcome box'
      });
    });

    it('should handle existing welcome box request', async () => {
      console.log('\nTest: Starting existing welcome box test');
      
      const mockStudent = {
        id: 'student-1',
        registrationPaid: true
      };
      console.log('Mock student:', mockStudent);

      console.log('Setting up prisma mocks...');
      (prismaMock.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prismaMock.welcomeBox.findFirst as jest.Mock).mockResolvedValue({
        id: 'welcome-box-1',
        status: 'pending'
      });
      console.log('Prisma mocks setup complete');

      mockRequest.body = {
        shippingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        }
      };
      console.log('Request body:', mockRequest.body);

      try {
        console.log('Calling requestWelcomeBox controller...');
        await StudentController.requestWelcomeBox(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'A welcome box request already exists for this student'
      });
    });
  });

  describe('getWelcomeBoxStatus', () => {
    beforeEach(() => {
      console.log('\n=== Setting up getWelcomeBoxStatus test ===');
      mockRequest = {
        ...mockRequest,
        user: { id: 'student-1' }
      };
      console.log('Mock request user:', mockRequest.user);
    });

    it('should get welcome box status', async () => {
      console.log('\nTest: Starting get welcome box status test');
      
      const mockWelcomeBox = {
        id: 'welcome-box-1',
        status: 'pending',
        trackingNumber: null
      };
      console.log('Mock welcome box:', mockWelcomeBox);

      console.log('Setting up prisma mocks...');
      (prismaMock.welcomeBox.findFirst as jest.Mock).mockResolvedValue(mockWelcomeBox);
      console.log('Prisma mocks setup complete');

      try {
        console.log('Calling getWelcomeBoxStatus controller...');
        await StudentController.getWelcomeBoxStatus(mockRequest as Request, mockResponse as Response);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
        console.log('Controller response:', response);
        console.log('Status code:', (mockResponse.status as jest.Mock).mock.calls[0][0]);
      } catch (error) {
        console.error('Error in controller:', error);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockWelcomeBox
      });
    });
  });
}); 