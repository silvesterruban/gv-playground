import { PrismaClient } from '@prisma/client';
import { sesService } from './aws/sesService';
import { JWTUtils } from '../utils/jwt';

const prisma = new PrismaClient();

export class NotificationService {
  // Email Verification
  static async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    console.log('📧 Debug: Starting sendVerificationEmail');
    console.log('📧 Debug: Parameters:', { email, firstName, tokenLength: token.length });
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    console.log('📧 Debug: Generated verification URL:', verificationUrl);
    
    const subject = '🎓 Verify Your Village Platform Email';
    console.log('📧 Debug: Email subject:', subject);
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Village Platform, ${firstName}!</h1>
        <p>Thank you for registering with Village Platform. To complete your registration, please verify your email address.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;
    console.log('📧 Debug: Email body generated');

    try {
      console.log('📧 Debug: Attempting to send email via SES...');
      await sesService.sendEmail(email, subject, htmlBody);
      console.log('✅ Debug: Email sent successfully to:', email);
    } catch (error) {
      console.error('❌ Debug: Failed to send verification email:', error);
      throw error;
    }
  }

  static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const { email, userType } = JWTUtils.verifyEmailVerificationToken(token);
      
      if (userType === 'student') {
        const student = await prisma.student.update({
          where: { email },
          data: { registrationStatus: 'verified' }
        });

        return {
          success: true,
          message: 'Email verified successfully! You can now complete your profile.'
        };
      }
      
      return {
        success: false,
        message: 'Invalid verification token'
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('expired')) {
        return {
          success: false,
          message: 'Verification token has expired. Please request a new one.'
        };
      }
      throw error;
    }
  }

  static async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const student = await prisma.student.findUnique({
      where: { email }
    });

    if (!student) {
      return {
        success: false,
        message: 'Student not found'
      };
    }

    if (student.registrationStatus === 'verified') {
      return {
        success: false,
        message: 'Email is already verified'
      };
    }

    const verificationToken = JWTUtils.generateEmailVerificationToken(email, 'student');
    await this.sendVerificationEmail(email, student.firstName, verificationToken);

    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  }

  // Donation Notifications
  static async sendDonationNotifications(donation: any): Promise<void> {
    // Send to donor
    await this.sendDonorThankYouEmail(donation);

    // Send to student (if not anonymous)
    if (!donation.isAnonymous) {
      await this.sendStudentNotificationEmail(donation);
    }

    // Send to admin for large donations
    if (Number(donation.amount) >= 1000) {
      await this.sendAdminNotificationEmail(donation);
    }
  }

  private static async sendDonorThankYouEmail(donation: any): Promise<void> {
    const subject = '💝 Donation Confirmation - Village Platform';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">Thank you for your donation! 💝</h1>
        <p>Your generous donation has been processed successfully.</p>
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin: 0 0 10px 0;">Donation Details</h3>
          <p><strong>Recipient:</strong> ${donation.student.firstName} ${donation.student.lastName}</p>
          <p><strong>Amount:</strong> $${(donation.amount / 100).toFixed(2)}</p>
          ${donation.taxReceiptNumber ? `<p><strong>Tax Receipt Number:</strong> ${donation.taxReceiptNumber}</p>` : ''}
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Your donation is tax-deductible. This email serves as your receipt.</p>
        <p>Thank you for supporting education and making a difference in a student's life!</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(donation.donorEmail, subject, htmlBody);
  }

  private static async sendStudentNotificationEmail(donation: any): Promise<void> {
    const subject = '🎓 New Donation Received - Village Platform';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Donation Received! 🎓</h1>
        <p>Dear ${donation.student.firstName},</p>
        <p>You have received a new donation of $${(donation.amount / 100).toFixed(2)}.</p>
        ${donation.donorMessage ? `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Message from Donor:</h3>
            <p>${donation.donorMessage}</p>
          </div>
        ` : ''}
        <p>Thank you for being part of our community!</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(donation.student.email, subject, htmlBody);
  }

  private static async sendAdminNotificationEmail(donation: any): Promise<void> {
    const subject = '⚠️ Large Donation Alert - Village Platform';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Large Donation Alert ⚠️</h1>
        <p>A large donation has been processed:</p>
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3>Donation Details</h3>
          <p><strong>Amount:</strong> $${(donation.amount / 100).toFixed(2)}</p>
          <p><strong>Student:</strong> ${donation.student.firstName} ${donation.student.lastName}</p>
          <p><strong>Donor:</strong> ${donation.donorEmail}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Please review this transaction in the admin dashboard.</p>
      </div>
    `;

    await sesService.sendEmail(process.env.ADMIN_EMAIL!, subject, htmlBody);
  }

  // Welcome Box Notifications
  static async sendWelcomeBoxStatusUpdate(welcomeBox: any): Promise<void> {
    const subject = `📦 Welcome Box ${welcomeBox.status.charAt(0).toUpperCase() + welcomeBox.status.slice(1)} - Village Platform`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome Box Status Update</h1>
        <p>Dear ${welcomeBox.student.firstName},</p>
        <p>Your welcome box status has been updated to: <strong>${welcomeBox.status}</strong></p>
        ${welcomeBox.trackingNumber ? `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Shipping Information</h3>
            <p><strong>Tracking Number:</strong> ${welcomeBox.trackingNumber}</p>
            ${welcomeBox.shippingAddress ? `
              <p><strong>Shipping Address:</strong><br>
              ${welcomeBox.shippingAddress.street}<br>
              ${welcomeBox.shippingAddress.city}, ${welcomeBox.shippingAddress.state} ${welcomeBox.shippingAddress.zipCode}</p>
            ` : ''}
          </div>
        ` : ''}
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(welcomeBox.student.email, subject, htmlBody);
  }

  // Platform Updates
  static async sendPlatformUpdate(
    updateId: string,
    title: string,
    content: string,
    userType: string,
    userId: string
  ): Promise<void> {
    let user: any = null;
    if (userType === 'student') {
      user = await prisma.student.findUnique({
        where: { id: userId },
        select: { email: true }
      });
    } else if (userType === 'donor') {
      user = await prisma.donor.findUnique({
        where: { id: userId },
        select: { email: true }
      });
    } else if (userType === 'admin') {
      user = await prisma.admin.findUnique({
        where: { id: userId },
        select: { email: true }
      });
    }

    if (!user || (user.preferences && !user.preferences.emailNotifications)) {
      return;
    }

    const subject = `📢 ${title} - Village Platform`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${title}</h1>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${content}
        </div>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(user.email, subject, htmlBody);
  }

  static async sendBatchedUpdates(updates: Array<{ id: string; title: string; content: string }>): Promise<void> {
    const subject = '📢 Village Platform Updates';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Platform Updates</h1>
        ${updates.map(update => `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${update.title}</h2>
            ${update.content}
          </div>
        `).join('')}
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    // In a real implementation, you would send this to all users who have opted in
    await sesService.sendEmail(process.env.ADMIN_EMAIL!, subject, htmlBody);
  }

  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    // @ts-ignore
    await (prisma as any).notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }
} 