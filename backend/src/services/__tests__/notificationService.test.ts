// Mock PrismaClient
const mockPrismaClient = {
  student: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donor: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  welcomeBox: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sesService } from '../aws/sesService';
import { NotificationService } from '../notificationService';

// Mock SES Service
jest.mock('../aws/sesService', () => ({
  sesService: {
    sendEmail: jest.fn(),
  },
}));

beforeAll(() => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
});

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Verification', () => {
    it('should send verification email with correct format', async () => {
      const email = 'test@example.com';
      const firstName = 'John';
      const token = 'test-token';

      await NotificationService.sendVerificationEmail(email, firstName, token);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        email,
        expect.stringContaining('Verify Your Village Platform Email'),
        expect.stringContaining(firstName)
      );
    });

    it('should handle expired verification token', async () => {
      const token = 'expired-token';
      mockPrismaClient.student.update.mockRejectedValue(new Error('Token expired'));

      await expect(NotificationService.verifyEmail(token)).rejects.toThrow('Invalid verification token');
    });

    it('should prevent multiple verifications', async () => {
      const email = 'test@example.com';
      mockPrismaClient.student.findUnique.mockResolvedValue({
        email,
        registrationStatus: 'verified'
      });

      const result = await NotificationService.resendVerificationEmail(email);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email is already verified');
    });
  });

  describe('Donation Notifications', () => {
    it('should send notifications for large donations', async () => {
      const donation = {
        amount: 1500,
        student: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'student@example.com'
        },
        donorEmail: 'donor@example.com'
      };

      await NotificationService.sendDonationNotifications(donation);

      expect(sesService.sendEmail).toHaveBeenCalledTimes(3); // Donor, student, and admin
    });

    it('should handle anonymous donations', async () => {
      const donation = {
        amount: 500,
        isAnonymous: true,
        student: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'student@example.com'
        },
        donorEmail: 'donor@example.com'
      };

      await NotificationService.sendDonationNotifications(donation);

      expect(sesService.sendEmail).toHaveBeenCalledTimes(1); // Only donor
    });

    it('should include tax receipt information', async () => {
      const donation = {
        amount: 1000,
        taxReceiptNumber: 'TAX-123',
        student: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'student@example.com'
        },
        donorEmail: 'donor@example.com'
      };

      await NotificationService.sendDonationNotifications(donation);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        donation.donorEmail,
        expect.any(String),
        expect.stringContaining('TAX-123')
      );
    });
  });

  describe('Welcome Box Notifications', () => {
    it('should send status update notifications', async () => {
      const welcomeBox = {
        status: 'shipped',
        student: {
          firstName: 'John',
          email: 'student@example.com'
        }
      };

      await NotificationService.sendWelcomeBoxStatusUpdate(welcomeBox);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        welcomeBox.student.email,
        expect.stringContaining('Shipped'),
        expect.stringContaining(welcomeBox.status)
      );
    });

    it('should include tracking information when available', async () => {
      const welcomeBox = {
        status: 'shipped',
        trackingNumber: 'TRACK-123',
        student: {
          firstName: 'John',
          email: 'student@example.com'
        }
      };

      await NotificationService.sendWelcomeBoxStatusUpdate(welcomeBox);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('TRACK-123')
      );
    });
  });

  describe('Platform Updates', () => {
    it('should respect user notification preferences', async () => {
      const updateId = 'update-123';
      const title = 'Test Update';
      const content = 'Test Content';
      const userType = 'student';
      const userId = 'user-123';

      mockPrismaClient[userType].findUnique.mockResolvedValue({
        email: 'test@example.com',
        preferences: {
          emailNotifications: false
        }
      });

      await NotificationService.sendPlatformUpdate(updateId, title, content, userType, userId);

      expect(sesService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle batched updates', async () => {
      const updates = [
        { id: '1', title: 'Update 1', content: 'Content 1' },
        { id: '2', title: 'Update 2', content: 'Content 2' }
      ];

      await NotificationService.sendBatchedUpdates(updates);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Update 1')
      );
    });

    it('should mark notifications as read', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-123';

      await NotificationService.markNotificationAsRead(notificationId, userId);

      expect(mockPrismaClient.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: expect.any(Date)
        }
      });
    });
  });
}); 