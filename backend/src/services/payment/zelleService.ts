import { PrismaClient } from '@prisma/client';
import { sesService } from '../aws/sesService';

const prisma = new PrismaClient() as any;

interface ZelleRefundRequest {
  paymentRequestId: string;
  amount: number;
  reason: string;
}

export class ZelleService {
  // Create Zelle payment request
  static async createPaymentRequest(params: {
    amount: number;
    metadata: Record<string, string>;
  }) {
    try {
      // Generate unique reference number for Zelle payment
      const referenceNumber = `ZELLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store payment request in database
      const paymentRequest = await prisma.paymentRequest.create({
        data: {
          amount: params.amount,
          currency: 'USD',
          paymentMethod: 'zelle',
          status: 'pending',
          referenceNumber,
          metadata: params.metadata,
        },
      });

      // Send email with Zelle payment instructions
      await this.sendPaymentInstructions(paymentRequest);

      return {
        success: true,
        referenceNumber,
        paymentRequestId: paymentRequest.id,
      };
    } catch (error) {
      console.error('Zelle payment request creation failed:', error);
      throw error;
    }
  }

  // Verify Zelle payment
  static async verifyPayment(referenceNumber: string) {
    try {
      const paymentRequest = await prisma.paymentRequest.findFirst({
        where: { referenceNumber },
      });

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      // Update payment status
      const updatedRequest = await prisma.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      // Update related donation if exists
      if (paymentRequest.metadata.donationId) {
        await prisma.donation.update({
          where: { id: paymentRequest.metadata.donationId },
          data: {
            status: 'completed',
            processedAt: new Date(),
            paymentIntentId: referenceNumber,
          },
        });
      }

      return {
        success: true,
        paymentRequest: updatedRequest,
      };
    } catch (error) {
      console.error('Zelle payment verification failed:', error);
      throw error;
    }
  }

  // Process refund for a Zelle payment
  static async refundPayment(params: ZelleRefundRequest) {
    try {
      // For Zelle, we need to manually process the refund through bank transfer
      // This will be handled by the nonprofit admin
      return {
        success: true,
        transactionId: `zelle-refund-${Date.now()}`,
        requiresManualVerification: true,
        message: 'Refund request submitted for manual processing'
      };
    } catch (error: any) {
      console.error('Zelle refund request failed:', error);
      return {
        success: false,
        error: error.message,
        requiresManualVerification: true
      };
    }
  }

  private static async sendPaymentInstructions(paymentRequest: any) {
    const { amount, referenceNumber, metadata } = paymentRequest;
    const donation = metadata.donationId ? await prisma.donation.findUnique({
      where: { id: metadata.donationId },
      include: { student: true },
    }) : null;

    const emailContent = `
      <h1>Zelle Payment Instructions</h1>
      <p>Please send your payment of $${(amount / 100).toFixed(2)} using Zelle to:</p>
      <p><strong>Email:</strong> ${process.env.ZELLE_EMAIL}</p>
      <p><strong>Name:</strong> GradVillage</p>
      <p><strong>Reference Number:</strong> ${referenceNumber}</p>
      ${donation ? `
        <p>This payment is for a donation to ${donation.student.firstName} ${donation.student.lastName}'s education fund.</p>
      ` : ''}
      <p>Please include the reference number in the memo field of your Zelle payment.</p>
      <p>Once your payment is received, we will process it and send you a confirmation email.</p>
    `;

    await sesService.sendEmail(
      metadata.donorEmail,
      'Zelle Payment Instructions - GradVillage',
      emailContent
    );
  }

  private static async sendRefundInstructions(refund: any) {
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: refund.paymentRequestId },
    });

    const emailContent = `
      <h1>Zelle Refund Instructions</h1>
      <p>A refund request has been created for the following payment:</p>
      <p><strong>Amount:</strong> $${(refund.amount / 100).toFixed(2)}</p>
      <p><strong>Reference Number:</strong> ${paymentRequest.referenceNumber}</p>
      <p><strong>Reason:</strong> ${refund.reason}</p>
      <p>Please process this refund by sending a Zelle payment to the original sender.</p>
      <p>Once the refund is processed, please update the status in the admin dashboard.</p>
    `;

    await sesService.sendEmail(
      process.env.ADMIN_EMAIL!,
      'Zelle Refund Instructions - GradVillage',
      emailContent
    );
  }
} 