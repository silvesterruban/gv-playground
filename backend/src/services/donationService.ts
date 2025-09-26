// backend/src/services/donationService.ts
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { StripeService } from './payment/stripeService';
import { PayPalService } from './payment/paypalService';
import { TaxReceiptService } from './taxReceiptService';
import { sesService } from './aws/sesService';

const prisma = new PrismaClient();

export interface CreateDonationRequest {
  studentId: string;
  amount: number;
  donationType: 'general' | 'registry_item' | 'emergency';
  targetRegistryId?: string;
  paymentMethod: 'stripe' | 'paypal' | 'zelle';

  // Donor Information (required for tax receipts)
  donorId?: string;
  donorEmail: string;
  donorFirstName?: string;
  donorLastName?: string;
  donorPhone?: string;
  donorAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Privacy Settings
  isAnonymous?: boolean;
  donorMessage?: string;
  allowPublicDisplay?: boolean;
  allowStudentContact?: boolean;

  // Recurring Settings
  isRecurring?: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annually';
}

export interface ProcessPaymentRequest {
  donationId: string;
  paymentMethodId?: string; // Stripe Payment Method ID
  paypalOrderId?: string;   // PayPal Order ID
  clientSecret?: string;    // For client-side confirmation
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  gatewayResponse?: any;
  requiresManualVerification?: boolean;
}

export class DonationService {

  // Create donation record (before payment processing)
  static async createDonation(data: CreateDonationRequest) {
    try {
      // Validate student exists
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Validate registry item if specified
      if (data.targetRegistryId) {
        const registryItem = await prisma.registry.findFirst({
          where: {
            id: data.targetRegistryId,
            studentId: data.studentId
          }
        });

        if (!registryItem) {
          throw new Error('Registry item not found');
        }
      }

     // Find or create donor if donorId not provided
      let donorId = data.donorId;
      if (!donorId && data.donorEmail) {
        const existingDonor = await prisma.donor.findFirst({
          where: { email: data.donorEmail }
        });
        if (existingDonor) {
          donorId = existingDonor.id;
          console.log("Found existing donor:", donorId);
          console.log("DEBUG: existingDonor.id:", existingDonor.id);          console.log("DEBUG: existingDonor.id type:", typeof existingDonor.id);
        } else {
          // Create new donor
          const newDonor = await prisma.donor.create({
            data: {
              email: data.donorEmail,
              firstName: data.donorFirstName || "",
              lastName: data.donorLastName || "",
              phone: data.donorPhone || "",
              passwordHash: "temp-hash-for-donation-only" // Temporary hash for donation-only donors
            }
          });
          donorId = newDonor.id;
          console.log("Created new donor:", donorId);
        }
      }
      if (!donorId) {
        throw new Error("Donor ID or email is required");
      }

      // Calculate fees (nonprofit rates are typically lower)
      const transactionFee = this.calculateTransactionFee(data.amount, data.paymentMethod);
      const netAmount = data.amount - transactionFee;

      // Generate unique tax receipt number
      const taxReceiptNumber = await this.generateTaxReceiptNumber();

      // Debug: Log donorId when creating donation
      console.log("Creating donation with donorId:", donorId);
      console.log("DEBUG: donorId value:", donorId);      console.log("DEBUG: donorId type:", typeof donorId);      console.log("DEBUG: donorId length:", donorId ? donorId.length : "null");      console.log("DEBUG: data.donorEmail:", data.donorEmail);

      // Create donation record
      const donation = await prisma.donation.create({
        data: {
          donorId: donorId,
          studentId: data.studentId,
          donorFirstName: data.donorFirstName,
          donorLastName: data.donorLastName,
          donorEmail: data.donorEmail,
          donorPhone: data.donorPhone,
          donorAddress: data.donorAddress,
          amount: data.amount,
          donationType: data.donationType,
          targetRegistryId: data.targetRegistryId,
          paymentMethod: data.paymentMethod,
          transactionFee,
          netAmount,
          isAnonymous: data.isAnonymous || false,
          donorMessage: data.donorMessage,
          allowPublicDisplay: data.allowPublicDisplay ?? true,
          allowStudentContact: data.allowStudentContact ?? false,
          isRecurring: data.isRecurring || false,
          recurringFrequency: data.recurringFrequency,
          taxReceiptNumber,
          status: 'pending'
        },
        include: {
          student: {
            select: { firstName: true, lastName: true, email: true }
          },
          targetRegistry: {
            select: { itemName: true, price: true }
          }
        }
      });

      return {
        success: true,
        donation,
        clientSecret: null // Will be set during payment processing
      };

    } catch (error) {
      console.error('Create donation error:', error);
      throw error;
    }
  }

  // Process payment through appropriate gateway
  static async processPayment(data: ProcessPaymentRequest) {
    try {
      const donation = await prisma.donation.findUnique({
        where: { id: data.donationId },
        include: {
          student: true,
          targetRegistry: true
        }
      });

      if (!donation) {
        throw new Error('Donation not found');
      }

      if (donation.status !== 'pending') {
        throw new Error('Donation already processed');
      }

      let paymentResult: PaymentResult;

      switch (donation.paymentMethod) {
        case 'stripe':
          paymentResult = await this.processStripePayment(donation, data.paymentMethodId!);
          break;
        case 'paypal':
          paymentResult = await this.processPayPalPayment(donation, data.paypalOrderId!);
          break;
        case 'zelle':
          paymentResult = await this.processZellePayment(donation);
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      // Update donation status
      const updatedDonation = await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: paymentResult.success ? 'completed' : 'failed',
          processedAt: paymentResult.success ? new Date() : null,
          failureReason: paymentResult.error,
          paymentIntentId: paymentResult.transactionId || null
        },
        include: {
          student: true,
          targetRegistry: true
        }
      });

      if (paymentResult.success) {
        // Create payment transaction record
        await this.createPaymentTransaction(updatedDonation, paymentResult);

        // Generate and send tax receipt
        await this.generateTaxReceipt(updatedDonation);

        // Send donation receipt PDF to student
        try {
          const receiptData = {
            receiptNumber: updatedDonation.taxReceiptNumber,
            receiptDate: updatedDonation.processedAt || updatedDonation.createdAt,
            taxYear: new Date().getFullYear(),
            nonprofitName: 'GradVillage',
            nonprofitEin: process.env.NONPROFIT_EIN || 'XX-XXXXXXX',
            nonprofitAddress: {
              street: process.env.NONPROFIT_ADDRESS_STREET || '123 Main St',
              city: process.env.NONPROFIT_ADDRESS_CITY || 'San Francisco',
              state: process.env.NONPROFIT_ADDRESS_STATE || 'CA',
              zipCode: process.env.NONPROFIT_ADDRESS_ZIP || '94105',
              country: 'US'
            },
            donorName: `${updatedDonation.donorFirstName || ''} ${updatedDonation.donorLastName || ''}`.trim(),
            donorAddress: updatedDonation.donorAddress || {
              street: 'Not provided',
              city: 'Not provided',
              state: 'Not provided',
              zipCode: 'Not provided'
            },
            donationAmount: Number(updatedDonation.amount),
            donationDate: updatedDonation.processedAt || updatedDonation.createdAt,
            donationDescription: `Donation to support ${updatedDonation.student?.firstName || ''} ${updatedDonation.student?.lastName || ''}`
          };
          const pdfBuffer = await TaxReceiptService.generateReceiptPdf(receiptData);
          const subject = '🎓 Your Donation Receipt - Village Platform';
          const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Thank you for your donation!</h1>
            <p>Dear ${updatedDonation.student?.firstName || 'Student'},</p>
            <p>Attached is your official donation receipt for your records.</p>
            <p>Best regards,<br><strong>The Village Team</strong></p>
          </div>`;
          // Send email with PDF attachment
          await sesService.sendEmailWithAttachment(
            updatedDonation.student?.email,
            subject,
            htmlBody,
            '', // textBody - empty string since we're sending HTML
            pdfBuffer,
            `${updatedDonation.taxReceiptNumber}.pdf`
          );
        } catch (err) {
          console.error('❌ Failed to send donation receipt PDF to student:', err);
        }

        // Update student's raised amount
        await this.updateStudentFunding(updatedDonation);

        // Update donor's totalDonated and studentsSupported (exclude registration_fee)
        if (updatedDonation.donorId && updatedDonation.donationType !== 'registration_fee') {
          // Count unique students supported by this donor
          const uniqueStudents = await prisma.donation.findMany({
            where: {
              donorId: updatedDonation.donorId,
              status: 'completed',
              donationType: { not: 'registration_fee' }
            },
            select: { studentId: true }
          });
          const uniqueStudentCount = new Set(uniqueStudents.map(d => d.studentId)).size;
          // Sum all completed, real donations
          const totalDonatedAgg = await prisma.donation.aggregate({
            where: {
              donorId: updatedDonation.donorId,
              status: 'completed',
              donationType: { not: 'registration_fee' }
            },
            _sum: { amount: true }
          });
          await prisma.donor.update({
            where: { id: updatedDonation.donorId },
            data: {
              totalDonated: totalDonatedAgg._sum.amount || 0,
              studentsSupported: uniqueStudentCount
            }
          });
        }

        // Send notification emails
        await this.sendDonationNotifications(updatedDonation);
      }

      return {
        success: paymentResult.success,
        donation: updatedDonation,
        error: paymentResult.error
      };

    } catch (error) {
      console.error('Process payment error:', error);
      throw error;
    }
  }

  // Process Stripe payment (nonprofit account)
  private static async processStripePayment(donation: any, paymentMethodId: string): Promise<PaymentResult> {
    try {
      // Use GradVillage nonprofit Stripe account
      const paymentIntent = await StripeService.createPaymentIntent({
        amount: Math.round(Number(donation.amount) * 100), // Convert to cents
        currency: 'usd',
        paymentMethodId,
        metadata: {
          donationId: donation.id,
          studentId: donation.studentId,
          donorEmail: donation.donorEmail,
          nonprofitId: 'gradvillage-501c3',
          taxReceiptNumber: donation.taxReceiptNumber
        },
        // Important: Use nonprofit account
        stripeAccount: process.env.STRIPE_NONPROFIT_ACCOUNT_ID
      });

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          gatewayResponse: paymentIntent
        };
      } else {
        return {
          success: false,
          error: 'Payment failed',
          gatewayResponse: paymentIntent
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        gatewayResponse: error
      };
    }
  }

  // Process PayPal payment (nonprofit account)
  private static async processPayPalPayment(donation: any, paypalOrderId: string): Promise<PaymentResult> {
    try {
      // Use GradVillage nonprofit PayPal account
      const paypalService = new PayPalService();
      const captureResult = await paypalService.capturePayment(paypalOrderId);

      // Type assertion for captureResult
      const result = captureResult as any;

      return {
        success: result.status === 'COMPLETED',
        transactionId: result.id,
        gatewayResponse: captureResult
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        gatewayResponse: error
      };
    }
  }

  // Process Zelle payment (manual verification)
  private static async processZellePayment(donation: any): Promise<PaymentResult> {
    // Zelle payments require manual verification by nonprofit admin
    return {
      success: false,
      error: 'Zelle payments require manual verification',
      requiresManualVerification: true
    };
  }

  // Create detailed payment transaction record
  private static async createPaymentTransaction(donation: any, paymentResult: PaymentResult) {
    return await prisma.paymentTransaction.create({
      data: {
        donationId: donation.id,
        provider: donation.paymentMethod,
        providerTransactionId: paymentResult.transactionId || 'unknown',
        providerFee: donation.transactionFee,
        grossAmount: donation.amount,
        netAmount: donation.netAmount,
        merchantAccountId: process.env[`${donation.paymentMethod.toUpperCase()}_NONPROFIT_ACCOUNT_ID`] || 'default',
        gatewayResponse: paymentResult.gatewayResponse,
        createdAt: new Date()
      }
    });
  }

  // Generate tax-deductible receipt
  private static async generateTaxReceipt(donation: any) {
    const receiptData = {
      donationId: donation.id,
      receiptNumber: donation.taxReceiptNumber,
      receiptDate: new Date(),
      taxYear: new Date().getFullYear(),
      donorName: donation.isAnonymous
        ? 'Anonymous Donor'
        : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim(),
      donorAddress: donation.donorAddress || {},
      donationAmount: donation.amount,
      donationDate: donation.processedAt,
      donationDescription: this.generateDonationDescription(donation),
      nonprofitAddress: {
        street: process.env.NONPROFIT_ADDRESS_STREET || '123 Nonprofit St',
        city: process.env.NONPROFIT_ADDRESS_CITY || 'San Francisco',
        state: process.env.NONPROFIT_ADDRESS_STATE || 'CA',
        zipCode: process.env.NONPROFIT_ADDRESS_ZIP || '94105',
        country: process.env.NONPROFIT_ADDRESS_COUNTRY || 'USA'
      }
    };

    const taxReceipt = await prisma.taxReceipt.create({
      data: receiptData
    });

    // Generate PDF receipt
    const receiptPdf = await TaxReceiptService.generateReceiptPdf(taxReceipt);

    // Upload to S3
    const receiptUrl = await TaxReceiptService.uploadReceiptToS3(receiptPdf, taxReceipt.receiptNumber);

    // Update tax receipt with PDF URL
    await prisma.taxReceipt.update({
      where: { id: taxReceipt.id },
      data: {
        receiptPdfUrl: receiptUrl,
        issued: true,
        issuedAt: new Date()
      }
    });

    // Send receipt email
    await this.sendTaxReceiptEmail(donation, receiptUrl);

    return taxReceipt;
  }

  // Update student funding amounts
  private static async updateStudentFunding(donation: any) {
    // Update student's total raised amount
      console.log("🔍 DEBUG: updateStudentFunding called for donation:", donation.id);      console.log("🔍 DEBUG: studentId:", donation.studentId);      console.log("🔍 DEBUG: netAmount:", donation.netAmount);
    await prisma.student.update({
      where: { id: donation.studentId },
      data: {
        amountRaised: {
          increment: Number(donation.netAmount)
        }
      }
    });

    // Update registry item funding if applicable
    if (donation.targetRegistryId) {
      await prisma.registry.update({
        where: { id: donation.targetRegistryId },
        data: {
          amountFunded: {
            increment: Number(donation.netAmount)
          },
          fundedStatus: 'partial' // Will be updated to 'funded' if goal reached
        }
      });

      // Check if item is fully funded
      const updatedRegistry = await prisma.registry.findUnique({
        where: { id: donation.targetRegistryId }
      });

      if (updatedRegistry && Number(updatedRegistry.amountFunded) >= Number(updatedRegistry.price)) {
        await prisma.registry.update({
          where: { id: donation.targetRegistryId },
          data: { fundedStatus: 'funded' }
        });
      }
    }
  }

  // Send notification emails
  private static async sendDonationNotifications(donation: any) {
    // Send thank you email to donor
    await this.sendDonorThankYouEmail(donation);

    // Send notification to student (if not anonymous)
    if (!donation.isAnonymous) {
      await this.sendStudentNotificationEmail(donation);
    }

    // Send admin notification for large donations
    if (Number(donation.amount) >= 1000) {
      await this.sendAdminNotificationEmail(donation);
    }
  }

  // Calculate transaction fees (nonprofit rates)
  private static calculateTransactionFee(amount: number, paymentMethod: string): number {
    const rates: Record<string, number> = {
      stripe: 0.022, // 2.2% for nonprofits
      paypal: 0.022, // 2.2% for nonprofits
      zelle: 0       // No fees for Zelle
    };

    const rate = rates[paymentMethod] || 0.029;
    return Math.round((amount * rate + 0.30) * 100) / 100; // Round to cents
  }

  // Generate unique tax receipt number
  private static async generateTaxReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const yearPrefix = `GV-${year}-`;

    // Use a transaction to prevent race conditions
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get the last receipt number for this year from the donations table
      const lastReceipt = await tx.donation.findFirst({
        where: {
          taxReceiptNumber: {
            startsWith: yearPrefix
          }
        },
        orderBy: {
          taxReceiptNumber: 'desc'
        }
      });

      let nextNumber = 1;
      if (lastReceipt && lastReceipt.taxReceiptNumber) {
        const receiptParts = lastReceipt.taxReceiptNumber.split('-');
        if (receiptParts.length >= 3) {
          const lastNumber = parseInt(receiptParts[2]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      return `${yearPrefix}${nextNumber.toString().padStart(6, '0')}`;
    });
  }
  // Generate donation description for tax receipt
  private static generateDonationDescription(donation: any): string {
    if (donation.targetRegistry) {
      return `Educational support donation for ${donation.targetRegistry.itemName}`;
    }
    return `Educational support donation for ${donation.student.firstName} ${donation.student.lastName}`;
  }

  // Email implementations
  private static async sendTaxReceiptEmail(donation: any, receiptUrl: string) {
    const subject = `Tax Receipt - Your Donation to GradVillage (Receipt #${donation.taxReceiptNumber})`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Thank you for your donation!</h1>
        <p>Dear ${donation.donorFirstName || 'Donor'},</p>

        <p>Thank you for your generous donation to GradVillage, a 501(c)(3) nonprofit organization.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Donation Details</h3>
          <p><strong>Amount:</strong> $${donation.amount}</p>
          <p><strong>Date:</strong> ${donation.processedAt.toDateString()}</p>
          <p><strong>Receipt Number:</strong> ${donation.taxReceiptNumber}</p>
          <p><strong>EIN:</strong> ${process.env.NONPROFIT_EIN}</p>
        </div>

        <p>Your donation is tax-deductible to the full extent allowed by law. Please keep this receipt for your tax records.</p>

        <p><a href="${receiptUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Download Tax Receipt (PDF)</a></p>

        <p>With gratitude,<br><strong>The GradVillage Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(donation.donorEmail, subject, htmlBody);
  }

  private static async sendDonorThankYouEmail(donation: any) {
    // Implementation for donor thank you email
    console.log(`Sending thank you email to ${donation.donorEmail}`);
  }

  private static async sendStudentNotificationEmail(donation: any) {
    // Implementation for student notification email
    console.log(`Sending notification to student ${donation.student.email}`);
  }

  private static async sendAdminNotificationEmail(donation: any) {
    // Implementation for admin notification email
    console.log(`Sending admin notification for large donation: $${donation.amount}`);
  }
}
