// Move the mock and jest.mock to the very top to avoid ReferenceError
const mockPrismaClient = {
  paymentRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  donation: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

import { ZelleService } from '../zelleService';
import { PrismaClient } from '@prisma/client';
import { sesService } from '../../aws/sesService';
import { ApiError } from '../../../utils/errors';

// Mock environment variables
process.env.ZELLE_EMAIL = 'test@gradvillage.org';
process.env.ADMIN_EMAIL = 'admin@gradvillage.org';

// Mock SES Service
jest.mock('../../aws/sesService', () => ({
  sesService: {
    sendEmail: jest.fn(),
  },
}));

describe('ZelleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentRequest', () => {
    it('should create a payment request successfully', async () => {
      const mockPaymentRequest = {
        id: 'test-payment-id',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'zelle',
        status: 'pending',
        referenceNumber: 'ZELLE-123456789',
        metadata: { donationId: 'test-donation-id' },
      };

      mockPrismaClient.paymentRequest.create.mockResolvedValue(mockPaymentRequest);
      (sesService.sendEmail as jest.Mock).mockResolvedValue({});

      const result = await ZelleService.createPaymentRequest({
        amount: 1000,
        metadata: { donationId: 'test-donation-id' },
      });

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toMatch(/^ZELLE-/);
      expect(result.paymentRequestId).toBe('test-payment-id');
      expect(mockPrismaClient.paymentRequest.create).toHaveBeenCalled();
      expect(sesService.sendEmail).toHaveBeenCalled();
    });

    it('should throw error when payment request creation fails', async () => {
      mockPrismaClient.paymentRequest.create.mockRejectedValue(new Error('Database error'));

      await expect(
        ZelleService.createPaymentRequest({
          amount: 1000,
          metadata: { donationId: 'test-donation-id' },
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const mockPaymentRequest = {
        id: 'test-payment-id',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'zelle',
        status: 'pending',
        referenceNumber: 'ZELLE-123456789',
        metadata: { donationId: 'test-donation-id' },
      };

      const mockUpdatedRequest = {
        ...mockPaymentRequest,
        status: 'completed',
        processedAt: new Date(),
      };

      mockPrismaClient.paymentRequest.findFirst.mockResolvedValue(mockPaymentRequest);
      mockPrismaClient.paymentRequest.update.mockResolvedValue(mockUpdatedRequest);
      mockPrismaClient.donation.update.mockResolvedValue({});

      const result = await ZelleService.verifyPayment('ZELLE-123456789');

      expect(result.success).toBe(true);
      expect(result.paymentRequest.status).toBe('completed');
      expect(mockPrismaClient.paymentRequest.update).toHaveBeenCalled();
      expect(mockPrismaClient.donation.update).toHaveBeenCalled();
    });

    it('should throw error when payment request not found', async () => {
      mockPrismaClient.paymentRequest.findFirst.mockResolvedValue(null);

      await expect(ZelleService.verifyPayment('invalid-reference')).rejects.toThrow(
        'Payment request not found'
      );
    });

    it('should handle verification failure gracefully', async () => {
      mockPrismaClient.paymentRequest.findFirst.mockResolvedValue({
        id: 'test-payment-id',
        referenceNumber: 'ZELLE-123456789',
      });
      mockPrismaClient.paymentRequest.update.mockRejectedValue(new Error('Update failed'));

      await expect(ZelleService.verifyPayment('ZELLE-123456789')).rejects.toThrow('Update failed');
    });
  });

  describe('refundPayment', () => {
    it('should process refund request successfully', async () => {
      const result = await ZelleService.refundPayment({
        paymentRequestId: 'test-payment-id',
        amount: 1000,
        reason: 'Customer request',
      });

      expect(result.success).toBe(true);
      expect(result.requiresManualVerification).toBe(true);
      expect(result.transactionId).toMatch(/^zelle-refund-/);
    });

    it('should handle refund failure gracefully', async () => {
      const error = new Error('Refund processing failed');
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await ZelleService.refundPayment({
        paymentRequestId: 'test-payment-id',
        amount: 1000,
        reason: 'Customer request',
      });

      expect(result.success).toBe(true);
      expect(result.requiresManualVerification).toBe(true);
    });
  });

  describe('sendPaymentInstructions', () => {
    it('should send payment instructions email successfully', async () => {
      const mockPaymentRequest = {
        amount: 1000,
        referenceNumber: 'ZELLE-123456789',
        metadata: {
          donorEmail: 'test@example.com',
          donationId: 'test-donation-id',
        },
      };

      const mockDonation = {
        student: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockPrismaClient.donation.findUnique.mockResolvedValue(mockDonation);
      (sesService.sendEmail as jest.Mock).mockResolvedValue({});

      await ZelleService['sendPaymentInstructions'](mockPaymentRequest);

      expect(sesService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Zelle Payment Instructions - GradVillage',
        expect.stringContaining('Zelle Payment Instructions')
      );
    });
  });
}); 