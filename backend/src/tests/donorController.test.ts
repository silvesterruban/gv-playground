import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DonorController } from '../controllers/donorController';
import bcrypt from 'bcryptjs';
import { JWTUtils } from '../utils/jwt';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    donor: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    donation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    registry: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    donorBookmark: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    recurringDonation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock JWTUtils
jest.mock('../utils/jwt', () => ({
  JWTUtils: {
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('DonorController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let prisma: PrismaClient;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Initialize Prisma client
    prisma = new PrismaClient();

    // Setup mock request
    mockRequest = {
      body: {},
      query: {},
      params: {},
      user: {
        userId: 'test-donor-id',
        email: 'test@example.com',
        userType: 'donor',
      },
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('registerDonor', () => {
    it('should register a new donor successfully', async () => {
      const mockDonor = {
        id: 'test-donor-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.donor.create as jest.Mock).mockResolvedValue(mockDonor);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await DonorController.registerDonor(mockRequest as Request, mockResponse as Response);

      expect(prisma.donor.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Donor account created successfully',
      }));
    });

    it('should return error if donor already exists', async () => {
      (prisma.donor.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-donor-id',
        email: 'existing@example.com',
      });

      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };

      await DonorController.registerDonor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'A donor account with this email already exists',
      }));
    });
  });

  describe('getProfile', () => {
    it('should return donor profile successfully', async () => {
      const mockDonor = {
        id: 'test-donor-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        address: '123 Test St',
        preferences: {
          emailNotifications: true,
          publicProfile: false
        },
        verified: true,
        memberSince: new Date(),
        totalDonated: 1000,
        studentsSupported: 5,
        impactScore: 75,
        lastLogin: new Date(),
        createdAt: new Date()
      };

      (prisma.donor.findUnique as jest.Mock).mockResolvedValue(mockDonor);

      await DonorController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: mockDonor.id,
          email: mockDonor.email
        })
      }));
    });

    it('should return 403 if user is not a donor', async () => {
      mockRequest.user = { userType: 'student' };

      await DonorController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Access denied. Donor account required.'
      }));
    });
  });

  describe('getStudents', () => {
    it('should return filtered students successfully', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          schoolName: 'Test University',
          major: 'Computer Science',
          fundingGoal: 10000,
          amountRaised: 5000
        }
      ];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(mockStudents);
      (prisma.student.count as jest.Mock).mockResolvedValue(1);
      (prisma.student.groupBy as jest.Mock).mockResolvedValue([
        { schoolName: 'Test University', _count: 1 }
      ]);

      mockRequest.query = {
        page: '1',
        limit: '10',
        school: 'Test University'
      };

      await DonorController.getStudents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          students: expect.arrayContaining([
            expect.objectContaining({
              id: 'student-1',
              school: 'Test University'
            })
          ])
        })
      }));
    });
  });

  describe('sponsorItem', () => {
    it('should sponsor an item successfully', async () => {
      const mockItem = {
        id: 'item-1',
        price: 1000,
        amountFunded: 0,
        fundedStatus: 'needed',
        student: {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };

      (prisma.registry.findUnique as jest.Mock).mockResolvedValue(mockItem);
      (prisma.donation.create as jest.Mock).mockResolvedValue({
        id: 'donation-1',
        amount: 500,
        status: 'pending',
        createdAt: new Date()
      });

      mockRequest.body = {
        itemId: 'item-1',
        amount: 500,
        message: 'Good luck!'
      };

      await DonorController.sponsorItem(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Item sponsorship successful'
      }));
    });

    it('should return error if item is already funded', async () => {
      (prisma.registry.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        fundedStatus: 'funded'
      });

      mockRequest.body = {
        itemId: 'item-1',
        amount: 500
      };

      await DonorController.sponsorItem(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'This item has already been fully funded'
      }));
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token for existing donor', async () => {
      const mockDonor = {
        id: 'test-donor-id',
        email: 'test@example.com'
      };

      (prisma.donor.findUnique as jest.Mock).mockResolvedValue(mockDonor);
      (JWTUtils.generateToken as jest.Mock).mockReturnValue('mock-reset-token');

      mockRequest.body = {
        email: 'test@example.com'
      };

      await DonorController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Password reset instructions sent to your email',
        data: { resetToken: 'mock-reset-token' }
      }));
    });

    it('should return success even if donor does not exist', async () => {
      (prisma.donor.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.body = {
        email: 'nonexistent@example.com'
      };

      await DonorController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      }));
    });
  });

  describe('exportDonationHistory', () => {
    it('should export donation history as CSV', async () => {
      const mockDonations = [
        {
          id: 'donation-1',
          amount: 100,
          createdAt: new Date(),
          student: {
            firstName: 'John',
            lastName: 'Doe',
            schoolName: 'Test University'
          },
          taxReceipt: {
            receiptNumber: 'REC-001',
            receiptPdfUrl: 'https://example.com/receipt.pdf'
          }
        }
      ];

      (prisma.donation.findMany as jest.Mock).mockResolvedValue(mockDonations);

      mockRequest.query = {
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      await DonorController.exportDonationHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="donation_history.csv"'
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('bookmarkStudent', () => {
    it('should bookmark a student successfully', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        schoolName: 'Test University'
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.donorBookmark.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.donorBookmark.create as jest.Mock).mockResolvedValue({
        id: 'bookmark-1',
        donorId: 'test-donor-id',
        studentId: 'student-1',
        createdAt: new Date()
      });

      mockRequest.body = {
        studentId: 'student-1'
      };

      await DonorController.bookmarkStudent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Student bookmarked successfully'
      }));
    });

    it('should return error if student is already bookmarked', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({ id: 'student-1' });
      (prisma.donorBookmark.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-bookmark'
      });

      mockRequest.body = {
        studentId: 'student-1'
      };

      await DonorController.bookmarkStudent(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Student is already bookmarked'
      }));
    });
  });

  describe('getBookmarks', () => {
    it('should return bookmarked students successfully', async () => {
      const mockBookmarks = [{
        id: 'bookmark-1',
        bookmarkedAt: new Date(),
        notes: undefined,
        studentId: 'student-1',
        student: {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          schoolName: 'Test University',
          major: 'Engineering',
          graduationYear: 2025,
          profilePhoto: 'photo.jpg',
          profileUrl: 'profile-url',
          bio: 'Student bio',
          fundingGoal: 10000,
          amountRaised: 5000,
          totalDonations: 10,
          urgency: 'high',
          verified: true,
          isActive: true,
          lastActive: new Date(),
          location: 'City',
          tags: ['tag1', 'tag2'],
          publicProfile: true,
          progressPercentage: 50,
          school: 'Test University',
        },
      }];

      (prisma.donorBookmark.findMany as jest.Mock).mockResolvedValue(mockBookmarks);
      (prisma.donorBookmark.count as jest.Mock).mockResolvedValue(1);

      await DonorController.getBookmarks(mockRequest as Request, mockResponse as Response);

      expect(prisma.donorBookmark.findMany).toHaveBeenCalledWith({
        where: { donorId: 'test-donor-id' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              schoolName: true,
              major: true,
              graduationYear: true,
              profilePhoto: true,
              profileUrl: true,
              bio: true,
              fundingGoal: true,
              amountRaised: true,
              totalDonations: true,
              urgency: true,
              verified: true,
              isActive: true,
              lastActive: true,
              location: true,
              tags: true,
              publicProfile: true,
            },
          },
        },
        orderBy: { bookmarkedAt: 'desc' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookmarks: mockBookmarks,
          total: 1,
        },
      });
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark successfully', async () => {
      (prisma.donorBookmark.findFirst as jest.Mock).mockResolvedValue({
        id: 'bookmark-1'
      });
      (prisma.donorBookmark.delete as jest.Mock).mockResolvedValue({
        id: 'bookmark-1'
      });

      mockRequest.params = {
        bookmarkId: 'bookmark-1'
      };

      await DonorController.removeBookmark(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Bookmark removed successfully'
      }));
    });

    it('should return error if bookmark does not exist', async () => {
      (prisma.donorBookmark.findFirst as jest.Mock).mockResolvedValue(null);

      mockRequest.params = {
        bookmarkId: 'nonexistent-bookmark'
      };

      await DonorController.removeBookmark(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Bookmark not found'
      }));
    });
  });

  describe('setupRecurringDonation', () => {
    it('should setup recurring donation successfully', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe'
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.recurringDonation.create as jest.Mock).mockResolvedValue({
        id: 'recurring-1',
        amount: 100,
        frequency: 'monthly',
        nextDonationDate: new Date(),
        status: 'active'
      });

      mockRequest.body = {
        studentId: 'student-1',
        amount: 100,
        frequency: 'monthly',
        startDate: '2024-01-01'
      };

      await DonorController.setupRecurringDonation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Recurring donation setup successful'
      }));
    });

    it('should return error if student does not exist', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.body = {
        studentId: 'nonexistent-student',
        amount: 100,
        frequency: 'monthly'
      };

      await DonorController.setupRecurringDonation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Student not found'
      }));
    });
  });

  describe('listRecurringDonations', () => {
    it('should return recurring donations successfully', async () => {
      (prisma.recurringDonation.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'recurring-1',
          amount: 100,
          frequency: 'monthly',
          nextDonationDate: new Date(),
          status: 'active',
          student: {
            id: 'student-1',
            firstName: 'John',
            lastName: 'Doe',
            schoolName: 'Test University',
          },
        },
      ]);

      await DonorController.listRecurringDonations(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'recurring-1',
            amount: 100,
            frequency: 'monthly',
          }),
        ]),
      }));
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockDecodedToken = {
        userId: 'test-donor-id',
        email: 'test@example.com',
        userType: 'donor',
        purpose: 'email_verification'
      };

      (JWTUtils.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.donor.update as jest.Mock).mockResolvedValue({
        id: 'test-donor-id',
        verified: true
      });

      mockRequest.body = {
        token: 'valid-token'
      };

      await DonorController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Email verified successfully'
      }));
    });

    it('should return error for invalid token', async () => {
      (JWTUtils.verifyToken as jest.Mock).mockReturnValue(null);

      mockRequest.body = {
        token: 'invalid-token'
      };

      await DonorController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid or expired verification token'
      }));
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences successfully', async () => {
      const mockPreferences = {
        emailNotifications: true,
        publicProfile: false,
        marketingEmails: true
      };

      (prisma.donor.update as jest.Mock).mockResolvedValue({
        id: 'test-donor-id',
        preferences: mockPreferences
      });

      mockRequest.body = {
        preferences: mockPreferences
      };

      await DonorController.updateNotificationPreferences(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          preferences: mockPreferences
        }
      }));
    });

    it('should return error if user is not a donor', async () => {
      mockRequest.user = { userType: 'student' };

      await DonorController.updateNotificationPreferences(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Access denied. Donor account required.'
      }));
    });
  });
}); 