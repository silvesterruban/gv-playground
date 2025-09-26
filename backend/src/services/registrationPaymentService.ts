import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe'; // Import for types only
import { StripeService } from './payment/stripeService';
import { sesService } from './aws/sesService';

const prisma = new PrismaClient();

export interface RegistrationPaymentRequest {
  studentId: string;
  paymentMethod: 'stripe' | 'paypal' | 'zelle';
  paymentMethodId?: string; // For Stripe payment method ID
}

export class RegistrationPaymentService {
  // Create a registration payment intent
  static async createPaymentIntent(studentId: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.registrationPaid) {
        throw new Error('Registration fee already paid');
      }

      // Use centralized StripeService instead of direct Stripe instance
      const paymentIntent = await StripeService.createPaymentIntent({
        amount: 2500, // $25.00 in cents
        currency: 'usd',
        metadata: {
          studentId,
          type: 'registration_fee'
        }
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Registration payment intent error:', error);
      throw error;
    }
  }

  // Process registration payment
  static async processPayment(data: RegistrationPaymentRequest) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: data.studentId }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.registrationPaid) {
        throw new Error('Registration fee already paid');
      }

      let paymentResult;

      switch (data.paymentMethod) {
        case 'stripe':
          if (!data.paymentMethodId) {
            throw new Error('Payment method ID required for Stripe');
          }
          paymentResult = await this.processStripePayment(data.paymentMethodId);
          break;
        case 'paypal':
          paymentResult = await this.processPayPalPayment();
          break;
        case 'zelle':
          paymentResult = await this.processZellePayment();
          break;
        default:
          throw new Error('Invalid payment method');
      }

      // Update student registration status
      await prisma.student.update({
        where: { id: data.studentId },
        data: {
          registrationPaid: true,
          registrationStatus: 'verified'
        }
      });

      // Send confirmation email
      await this.sendPaymentConfirmationEmail(student.email, student.firstName);

      return {
        success: true,
        message: 'Registration payment processed successfully',
        paymentDetails: paymentResult
      };
    } catch (error) {
      console.error('Registration payment error:', error);
      throw error;
    }
  }

  // Handle Stripe webhook events
  static async handleStripeWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleSuccessfulPayment(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object as Stripe.PaymentIntent);
          break;
      }
    } catch (error) {
      console.error('Stripe webhook error:', error);
      throw error;
    }
  }

  // Private helper methods
  private static async processStripePayment(paymentMethodId: string) {
    // Use centralized StripeService instead of direct Stripe instance
    const paymentIntent = await StripeService.createPaymentIntent({
      amount: 500, // $5.00 in cents
      currency: 'usd',
      paymentMethodId,
      metadata: {
        type: 'registration_fee'
      }
    });

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };
  }

  private static async processPayPalPayment() {
    // TODO: Implement PayPal payment processing
    throw new Error('PayPal payment processing not implemented');
  }

  private static async processZellePayment() {
    // TODO: Implement Zelle payment processing
    throw new Error('Zelle payment processing not implemented');
  }

  private static async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    const studentId = paymentIntent.metadata.studentId;
    
    if (studentId) {
      await prisma.student.update({
        where: { id: studentId },
        data: {
          registrationPaid: true,
          registrationStatus: 'verified'
        }
      });

      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (student) {
        await this.sendPaymentConfirmationEmail(student.email, student.firstName);
      }
    }
  }

  private static async handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    const studentId = paymentIntent.metadata.studentId;
    
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (student) {
        await this.sendPaymentFailureEmail(student.email, student.firstName);
      }
    }
  }

  static async sendPaymentConfirmationEmail(email: string, firstName: string, receiptUrl?: string, receiptNumber?: string) {
    const subject = '🎓 Welcome to GradVillage - Your Registration is Complete!';
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px;">
        <!-- Header -->
        <div style="background: white; border-radius: 8px; padding: 30px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 700;">🎓 Welcome to GradVillage!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Your registration payment has been confirmed</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">✅ Payment Successful!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your account is now fully activated and ready to use</p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Dear <strong>${firstName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Congratulations! You've successfully joined the GradVillage community. We're thrilled to have you on board and excited to help you achieve your educational goals.
          </p>

          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">📄 Your Receipt</h3>
            <p style="color: #64748b; margin: 0 0 15px 0;">A detailed tax-deductible receipt has been generated for your records.</p>
            <a href="${process.env.FRONTEND_URL || 'https://thunder.gradvillage.com'}/api/receipt/${receiptNumber || 'GV2025-032721-QX7O'}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Download Receipt PDF</a>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Click the button above to download your official tax receipt</p>
          </div>

          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">🚀 What's Next?</h3>
            <div style="color: #374151; line-height: 1.8;">
              <div style="margin-bottom: 12px;">
                <strong>1. Complete Your Profile</strong><br>
                <span style="color: #6b7280;">Add your photo, bio, and academic details to make your profile stand out</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong>2. Create Your Registry</strong><br>
                <span style="color: #6b7280;">Add items you need for your education - textbooks, supplies, equipment</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong>3. Share Your Story</strong><br>
                <span style="color: #6b7280;">Tell your story and share your registry with potential donors</span>
              </div>
              <div>
                <strong>4. Start Receiving Support</strong><br>
                <span style="color: #6b7280;">Watch as the community comes together to support your education</span>
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tip</h3>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              The more detailed and personal your profile is, the more likely you are to receive donations. Share your goals, challenges, and how education will help you make a difference!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://gradvillage.com'}/student/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Go to Your Dashboard
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              Need help? We're here for you!
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Email: <a href="mailto:support@gradvillage.com" style="color: #3b82f6;">support@gradvillage.com</a> | 
              Phone: <a href="tel:+1-555-GRADVILLAGE" style="color: #3b82f6;">1-555-GRADVILLAGE</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: white; font-size: 12px; opacity: 0.8;">
          <p style="margin: 0;">© 2024 GradVillage. Making education accessible, one student at a time.</p>
          <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const textBody = `
🎓 Welcome to GradVillage - Your Registration is Complete!

Dear ${firstName},

Congratulations! You've successfully joined the GradVillage community. We're thrilled to have you on board and excited to help you achieve your educational goals.

✅ Payment Successful!
Your account is now fully activated and ready to use.

${receiptUrl ? `📄 Your Receipt
A detailed receipt has been generated and is attached to this email for your records.
Download: ${receiptUrl}` : ''}

🚀 What's Next?

1. Complete Your Profile
   Add your photo, bio, and academic details to make your profile stand out

2. Create Your Registry
   Add items you need for your education - textbooks, supplies, equipment

3. Share Your Story
   Tell your story and share your registry with potential donors

4. Start Receiving Support
   Watch as the community comes together to support your education

💡 Pro Tip
The more detailed and personal your profile is, the more likely you are to receive donations. Share your goals, challenges, and how education will help you make a difference!

Go to Your Dashboard: ${process.env.FRONTEND_URL || 'https://gradvillage.com'}/student/dashboard

Need help? We're here for you!
Email: support@gradvillage.com
Phone: 1-555-GRADVILLAGE

© 2024 GradVillage. Making education accessible, one student at a time.
This email was sent to ${email}
    `;

    await sesService.sendEmail(email, subject, htmlBody, textBody);
  }

  private static async sendPaymentFailureEmail(email: string, firstName: string) {
    const subject = '❌ Registration Payment Failed';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Registration Payment Failed</h1>
        <p>Dear ${firstName},</p>
        <p>We were unable to process your registration payment. Please try again or contact support if the issue persists.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What to do next:</h3>
          <ul>
            <li>Check your payment method details</li>
            <li>Ensure you have sufficient funds</li>
            <li>Try using a different payment method</li>
            <li>Contact support if you need assistance</li>
          </ul>
        </div>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(email, subject, htmlBody);
  }
} 