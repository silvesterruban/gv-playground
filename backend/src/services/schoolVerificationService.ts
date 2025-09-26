import { PrismaClient } from '@prisma/client';
import { s3Service } from './aws/s3Service';
import { sesService } from './aws/sesService';

export interface SchoolVerificationRequest {
  studentId: string;
  schoolId: string;
  studentIdNumber: string;
  verificationMethod: 'email' | 'id_card' | 'transcript';
  verificationDocument?: Buffer;
  documentType?: string;
}

export class SchoolVerificationService {
  // Submit school verification request
  static async submitVerification(data: SchoolVerificationRequest) {
    const prisma = new PrismaClient();
    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        include: { schoolVerification: true }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Check if school exists
      const school = await prisma.school.findUnique({
        where: { id: data.schoolId }
      });

      if (!school) {
        throw new Error('School not found');
      }

      // Check if verification method is supported by school
      const supportedMethods = school.verificationMethods || ['email', 'id_card', 'transcript'];
      if (!supportedMethods.includes(data.verificationMethod)) {
        throw new Error('Verification method not supported by school');
      }

      // If document is provided, upload to S3
        let documentUrl: string | null = null;
        if (data.verificationDocument && data.documentType) {
          const fileName = `verification/${data.studentId}/${Date.now()}.${data.documentType}`;
          const uploadResult = await s3Service.uploadFile(
            data.verificationDocument,
            fileName,
            `application/${data.documentType}`,
            'verifications'
          );
          // If uploadResult is an object, extract the URL string
          documentUrl = uploadResult?.url || null;
        }

      // Create or update verification record
      const verification = await prisma.schoolVerification.upsert({
        where: { studentId: data.studentId },
        update: {
          schoolId: data.schoolId,
          verificationMethod: data.verificationMethod,
          verificationDocument: documentUrl,
          status: 'pending',
          updatedAt: new Date()
        },
        create: {
          studentId: data.studentId,
          schoolId: data.schoolId,
          verificationMethod: data.verificationMethod,
          verificationDocument: documentUrl,
          status: 'pending'
        }
      });

      // If email verification, send verification email
      if (data.verificationMethod === 'email') {
        await this.sendVerificationEmail(student.email, school.domain || '');
      }

      return {
        success: true,
        message: 'Verification request submitted successfully',
        verification
      };
    } catch (error) {
      console.error('School verification error:', error);
      throw error;
    }
  }

  // Verify student's school status
  static async verifyStudent(studentId: string, adminId: string, approved: boolean, reason?: string) {
    const prisma = new PrismaClient();
    try {
      const verification = await prisma.schoolVerification.findUnique({
        where: { studentId },
        include: { student: true }
      });

      if (!verification) {
        throw new Error('Verification request not found');
      }

      const status = approved ? 'verified' : 'rejected';

      // Update verification status
      const updatedVerification = await prisma.schoolVerification.update({
        where: { studentId },
        data: {
          status: status,
          verifiedBy: adminId,
          verifiedAt: new Date(),
          rejectionReason: approved ? null : reason
        }
      });

      // Update student's verification status
      await prisma.student.update({
        where: { id: studentId },
        data: {
          schoolVerified: approved,
          studentIdVerified: approved
        }
      });

      // Send notification email
      await this.sendVerificationResultEmail(
        verification.student.email,
        verification.student.firstName,
        approved,
        reason
      );

      return {
        success: true,
        message: `Verification ${approved ? 'approved' : 'rejected'} successfully`,
        verification: updatedVerification
      };
    } catch (error) {
      console.error('Student verification error:', error);
      throw error;
    }
  }

  // Private helper methods
  private static async sendVerificationEmail(studentEmail: string, schoolDomain: string) {
    const subject = '🎓 School Email Verification';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Verify Your School Email</h1>
        <p>To verify your student status, please reply to this email from your school email address (${schoolDomain}).</p>
        <p>This helps us ensure that you are a current student at your institution.</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(studentEmail, subject, htmlBody);
  }

  private static async sendVerificationResultEmail(
    studentEmail: string,
    studentName: string,
    approved: boolean,
    reason?: string
  ) {
    const subject = approved ? '✅ School Verification Approved' : '❌ School Verification Rejected';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${approved ? '#059669' : '#dc2626'};">School Verification ${approved ? 'Approved' : 'Rejected'}</h1>
        <p>Dear ${studentName},</p>
        <p>Your school verification has been ${approved ? 'approved' : 'rejected'}.</p>
        ${!approved && reason ? `<p>Reason: ${reason}</p>` : ''}
        ${approved ? `
          <p>You can now proceed with completing your profile and registration.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Next Steps:</h3>
            <ul>
              <li>Complete your profile</li>
              <li>Pay the registration fee</li>
              <li>Add items to your registry</li>
            </ul>
          </div>
        ` : `
          <p>Please review the reason for rejection and submit a new verification request if needed.</p>
        `}
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(studentEmail, subject, htmlBody);
  }
} 