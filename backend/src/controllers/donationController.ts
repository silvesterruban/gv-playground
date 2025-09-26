// backend/src/controllers/donationController.ts
import { Request, Response } from 'express';
import { DonationService, CreateDonationRequest, ProcessPaymentRequest } from '../services/donationService';

export class DonationController {
  // Create a new donation (before payment processing)
  static async createDonation(req: Request, res: Response) {
    try {
      console.log('🔍 Debug: Create donation request received');
      console.log('🔍 Debug: Request body:', req.body);
      console.log('🔍 Debug: User from token:', req.user);

      const donorId = req.user?.id;
      const userType = req.user?.userType;

      if (!donorId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: No donor ID found'
        });
      }

      if (userType !== 'donor') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only donors can create donations'
        });
      }

      // Extract donor info from authenticated user
      const donorEmail = req.user?.email;
      const donorFirstName = req.user?.firstName;
      const donorLastName = req.user?.lastName;
      const donorPhone = req.user?.phone;
      const donorAddress = req.user?.address;

      // Ensure all required donor fields are present
      if (!donorId || !donorEmail || !donorFirstName || !donorLastName) {
        return res.status(400).json({
          success: false,
          message: 'Missing donor information. Please log in again or contact support.'
        });
      }

      // Extract donation data from request
      const donationData: CreateDonationRequest = {
        studentId: req.body.studentId,
        amount: req.body.amount, // Should be in cents
        donationType: req.body.donationType || 'general',
        targetRegistryId: req.body.targetRegistryId,
        paymentMethod: req.body.paymentMethod,

        // Donor information (always from authenticated user)
        donorId: donorId,
        donorEmail: donorEmail,
        donorFirstName: donorFirstName,
        donorLastName: donorLastName,
        donorPhone: donorPhone,
        donorAddress: donorAddress,

        // Privacy settings
        isAnonymous: req.body.isAnonymous || false,
        donorMessage: req.body.donorMessage,
        allowPublicDisplay: req.body.allowPublicDisplay ?? true,
        allowStudentContact: req.body.allowStudentContact || false,

        // Recurring settings
        isRecurring: req.body.isRecurring || false,
        recurringFrequency: req.body.recurringFrequency
      };

      console.log('🔍 Debug: Processed donation data:', donationData);

      const result = await DonationService.createDonation(donationData);

      if (result.success) {
        console.log('✅ Debug: Donation created successfully');
        res.status(201).json(result);
      } else {
        console.log('❌ Debug: Donation creation failed');
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ Debug: Create donation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during donation creation',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Process payment for existing donation
  static async processPayment(req: Request, res: Response) {
    try {
      console.log('🔍 Debug: Process payment request received');
      console.log('🔍 Debug: Request body:', req.body);

      const donorId = req.user?.id;

      if (!donorId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const paymentData: ProcessPaymentRequest = {
        donationId: req.body.donationId,
        paymentMethodId: req.body.paymentMethodId,
        paypalOrderId: req.body.paypalOrderId,
        clientSecret: req.body.clientSecret
      };

      console.log('🔍 Debug: Processing payment for donation:', paymentData.donationId);

      const result = await DonationService.processPayment(paymentData);

      if (result.success) {
        console.log('✅ Debug: Payment processed successfully');
        res.status(200).json(result);
      } else {
        console.log('❌ Debug: Payment processing failed:', result.error);
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ Debug: Process payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during payment processing',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Get donation by ID
  static async getDonation(req: Request, res: Response) {
    try {
      const { donationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // TODO: Implement get donation logic
      // For now, return placeholder
      res.status(200).json({
        success: true,
        message: 'Get donation endpoint - to be implemented'
      });
    } catch (error) {
      console.error('❌ Debug: Get donation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Cancel/refund donation
  static async requestRefund(req: Request, res: Response) {
    try {
      const { donationId } = req.params;
      const { reason } = req.body;
      const donorId = req.user?.id;

      if (!donorId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // TODO: Implement refund request logic
      res.status(200).json({
        success: true,
        message: 'Refund request endpoint - to be implemented'
      });
    } catch (error) {
      console.error('❌ Debug: Request refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get donation receipt
  static async getReceipt(req: Request, res: Response) {
    try {
      const { donationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // TODO: Implement get receipt logic
      res.status(200).json({
        success: true,
        message: 'Get receipt endpoint - to be implemented'
      });
    } catch (error) {
      console.error('❌ Debug: Get receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Webhook handler for payment confirmations
  static async handleWebhook(req: Request, res: Response) {
    try {
      console.log('🔍 Debug: Webhook received');

      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      // TODO: Implement webhook handling
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Debug: Webhook error:', error);
      res.status(400).json({
        success: false,
        message: 'Webhook handling failed'
      });
    }
  }
}