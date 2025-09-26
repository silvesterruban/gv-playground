import { PrismaClient } from '@prisma/client';
import { JWTUtils } from '../utils/jwt';
import { PasswordUtils } from '../utils/password';
import { sesService } from './aws/sesService';
import {
  LoginRequest,
  StudentRegisterRequest,
  AdminRegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  RefreshTokenRequest,
  JWTTokenPayload  // ← Added this import
} from '../types/auth';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class AuthService {
  // Student registration - MODIFIED: No database insertion until payment
  static async registerStudent(data: StudentRegisterRequest): Promise<AuthResponse> {
    try {
      console.log('🔍 Debug: Starting student registration process');
      
      // Check if student already exists
      const existingStudent = await prisma.student.findUnique({
        where: { email: data.email }
      });

      if (existingStudent) {
        console.log('❌ Debug: Student already exists with email:', data.email);
        return {
          success: false,
          message: 'A student account with this email already exists'
        };
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(data.password);

      // Generate profile URL
      const profileUrl = this.generateProfileUrl(data.firstName, data.lastName);

      // Generate email verification token
      const verificationToken = JWTUtils.generateEmailVerificationToken(
        data.email,
        'student'
      );

      // Store registration data temporarily (in memory or Redis for now)
      // In production, you might want to use Redis or a temporary table
      const registrationData = {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        schoolName: data.school,
        major: data.major,
        profileUrl,
        verificationToken,
        createdAt: new Date()
      };

      console.log('🔍 Debug: Registration data prepared:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        school: data.school
      });

      // Send verification email
      console.log('🔍 Debug: Sending verification email to:', data.email);
      await this.sendVerificationEmail(data.email, data.firstName, verificationToken);

      // Log registrationData for automation
      console.log('🔍 Debug: registrationData:', JSON.stringify(registrationData));

      // Return success but indicate payment is required
      return {
        success: true,
        message: 'Registration successful! You can now log in to verify your account and complete payment.',
        verificationToken,
        requiresPayment: true,
        registrationData // This would be stored securely in production
      };
    } catch (error) {
      console.error('❌ Debug: Student registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  // Admin registration (restricted)
  static async registerAdmin(data: AdminRegisterRequest): Promise<AuthResponse> {
    try {
      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: data.email }
      });

      if (existingAdmin) {
        return {
          success: false,
          message: 'An admin account with this email already exists'
        };
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(data.password);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role
        }
      });

      // Generate tokens - FIXED: Added verified property
      const payload: JWTTokenPayload = {
        id: admin.id,
        email: admin.email,
        userType: 'admin' as const,
        verified: true,  // ← Added this line
        role: admin.role
      };

      const token = JWTUtils.generateToken(payload);
      const refreshToken = JWTUtils.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          userType: 'admin',
          role: admin.role
        },
        expiresIn: JWTUtils.getTokenExpiration()
      };
    } catch (error) {
      console.error('Admin registration error:', error);
      return {
        success: false,
        message: 'Admin registration failed. Please try again.'
      };
    }
  }

  // Login
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      if (data.userType === 'student') {
        return await this.loginStudent(data.email, data.password);
      } else if (data.userType === 'admin') {
        return await this.loginAdmin(data.email, data.password);
      } else if (data.userType === 'donor') {
        return await this.loginDonor(data.email, data.password);
      } else {
        return {
          success: false,
          message: 'Invalid user type'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Student login
  private static async loginStudent(email: string, password: string): Promise<AuthResponse> {
    const student = await prisma.student.findUnique({
      where: { email }
    });

    if (!student || !student.isActive) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Verify password
    const isValidPassword = await PasswordUtils.comparePassword(password, student.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Generate tokens - FIXED: Now properly typed
    const payload: JWTTokenPayload = {
      id: student.id,
      email: student.email,
      userType: 'student' as const,
      verified: student.registrationStatus === 'verified'
    };

    const token = JWTUtils.generateToken(payload);
    const refreshToken = JWTUtils.generateRefreshToken(payload);

    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        userType: 'student',
        verified: student.registrationStatus === 'verified'
      },
      expiresIn: JWTUtils.getTokenExpiration()
    };
  }

  // Admin login
  private static async loginAdmin(email: string, password: string): Promise<AuthResponse> {
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin || !admin.isActive) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Verify password
    const isValidPassword = await PasswordUtils.comparePassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Generate tokens - FIXED: Now properly typed
    const payload: JWTTokenPayload = {
      id: admin.id,
      email: admin.email,
      userType: 'admin' as const,
      verified: true, // Admins are always verified
      role: admin.role
    };
    const token = JWTUtils.generateToken(payload);
    const refreshToken = JWTUtils.generateRefreshToken(payload);

    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        userType: 'admin',
        role: admin.role
      },
      expiresIn: JWTUtils.getTokenExpiration()
    };
  }
  
  // Donor login
  private static async loginDonor(email: string, password: string): Promise<AuthResponse> {
    console.log('DEBUG: Trying to login donor with email:', email);
    
    const donor = await prisma.donor.findUnique({
      where: { email }
    });
    
    console.log('DEBUG: Donor found:', donor ? 'Yes' : 'No', donor);

    if (!donor || !donor.isActive) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Verify password
    console.log('DEBUG: Comparing password hash:', password, donor.passwordHash);
    const isValidPassword = await PasswordUtils.comparePassword(password, donor.passwordHash);
    console.log('DEBUG: Password valid:', isValidPassword ? 'Yes' : 'No');
    
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Update last login
    await prisma.donor.update({
      where: { id: donor.id },
      data: { lastLogin: new Date() }
    });

    // Generate tokens
    const payload: JWTTokenPayload = {
      id: donor.id,
      email: donor.email,
      userType: 'donor' as const,
      verified: donor.verified || false
    };
    
    const token = JWTUtils.generateToken(payload);
    const refreshToken = JWTUtils.generateRefreshToken(payload);

    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: donor.id,
        email: donor.email,
        firstName: donor.firstName,
        lastName: donor.lastName,
        userType: 'donor',
        verified: donor.verified || false
      },
      expiresIn: JWTUtils.getTokenExpiration()
    };
  }

  // Email verification - MODIFIED for new registration flow
  static async verifyEmail(data: VerifyEmailRequest): Promise<AuthResponse> {
    try {
      console.log('🔍 Debug: Email verification request received');
      
      const { email, userType } = JWTUtils.verifyEmailVerificationToken(data.token);
      console.log('🔍 Debug: Token verified for:', { email, userType });

      if (userType === 'student') {
        // Check if student exists in database (should not exist yet with new flow)
        const existingStudent = await prisma.student.findUnique({
          where: { email }
        });

        if (existingStudent) {
          console.log('🔍 Debug: Student already exists, updating verification status');
          // Student exists (legacy case), update verification status
          const student = await prisma.student.update({
            where: { email },
            data: { registrationStatus: 'verified' }
          });

          return {
            success: true,
            message: 'Email verified successfully. You can now log in.',
            user: {
              id: student.id,
              email: student.email,
              firstName: student.firstName,
              lastName: student.lastName,
              userType: 'student',
              verified: true
            }
          };
        } else {
          console.log('✅ Debug: Student not in database yet (new flow), verification successful');
          // Student doesn't exist yet (new flow), verification is successful
          // The actual student record will be created after payment
          return {
            success: true,
            message: 'Email verified successfully. Please complete payment to finish registration.',
            requiresPayment: true
          };
        }
      } else {
        console.log('❌ Debug: Invalid user type for verification:', userType);
        return {
          success: false,
          message: 'Invalid user type for verification'
        };
      }
    } catch (error) {
      console.error('❌ Debug: Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed. Please try again.'
      };
    }
  }

  // Forgot password
  static async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    try {
      // Check if user exists
      let userExists = false;
      let firstName = '';

      if (data.userType === 'student') {
        const student = await prisma.student.findUnique({
          where: { email: data.email }
        });
        userExists = !!student;
        firstName = student?.firstName || '';
      } else if (data.userType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { email: data.email }
        });
        userExists = !!admin;
        firstName = admin?.firstName || '';
      } else if (data.userType === 'donor') {
        const donor = await prisma.donor.findUnique({
          where: { email: data.email }
        });
        userExists = !!donor;
        firstName = donor?.firstName || '';
      }

      // Always return success message for security (don't reveal if email exists)
      if (userExists) {
        const resetToken = JWTUtils.generatePasswordResetToken(data.email, data.userType);
        await this.sendPasswordResetEmail(data.email, firstName, resetToken);
      }

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'Failed to process password reset request.'
      };
    }
  }

  // Reset password
  static async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    try {
      const { email, userType } = JWTUtils.verifyPasswordResetToken(data.token);
      const passwordHash = await PasswordUtils.hashPassword(data.newPassword);

      if (userType === 'student') {
        await prisma.student.update({
          where: { email },
          data: { passwordHash }
        });
      } else if (userType === 'admin') {
        await prisma.admin.update({
          where: { email },
          data: { passwordHash }
        });
      } else if (userType === 'donor') {
        await prisma.donor.update({
          where: { email },
          data: { passwordHash }
        });
      }

      return {
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Refresh token
  static async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    try {
      const payload = JWTUtils.verifyRefreshToken(data.refreshToken);

      // Verify user still exists and is active
      let userExists = false;
      let userInfo = null;

      if (payload.userType === 'student') {
        const student = await prisma.student.findUnique({
          where: { id: payload.id }
        });
        userExists = !!(student && student.isActive);
        if (student) {
          userInfo = {
            id: student.id,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            userType: 'student' as const,
            verified: student.registrationStatus === 'verified'
          };
        }
      } else if (payload.userType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: payload.id }
        });
        userExists = !!(admin && admin.isActive);
        if (admin) {
          userInfo = {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            userType: 'admin' as const,
            role: admin.role
          };
        }
      } else if (payload.userType === 'donor') {
        const donor = await prisma.donor.findUnique({
          where: { id: payload.id }
        });
        userExists = !!(donor && donor.isActive);
        if (donor) {
          userInfo = {
            id: donor.id,
            email: donor.email,
            firstName: donor.firstName,
            lastName: donor.lastName,
            userType: 'donor' as const,
            verified: donor.verified || false
          };
        }
      }

      if (!userExists || !userInfo) {
        return {
          success: false,
          message: 'User no longer exists or is inactive'
        };
      }

      // Generate new tokens - Create new payload for token generation
      const newPayload: JWTTokenPayload = {
        id: payload.id,
        email: payload.email,
        userType: payload.userType,
        verified: payload.verified,
        ...(payload.role && { role: payload.role })
      };

      const newToken = JWTUtils.generateToken(newPayload);
      const newRefreshToken = JWTUtils.generateRefreshToken(newPayload);

      return {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        user: userInfo,
        expiresIn: JWTUtils.getTokenExpiration()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Resend student verification email
  static async resendStudentVerification(email: string): Promise<AuthResponse> {
    try {
      console.log('🔍 Debug: ResendStudentVerification called for email:', email);
      
      const student = await prisma.student.findUnique({
        where: { email }
      });
      console.log('🔍 Debug: Found student:', student ? 'Yes' : 'No');

      if (!student) {
        console.log('❌ Debug: Student not found');
        return {
          success: false,
          message: 'Student not found'
        };
      }

      if (student.registrationStatus === 'verified') {
        console.log('❌ Debug: Email already verified');
        return {
          success: false,
          message: 'Email is already verified'
        };
      }

      console.log('🔍 Debug: Generating new verification token');
      const verificationToken = JWTUtils.generateEmailVerificationToken(email, 'student');
      console.log('🔍 Debug: Token generated successfully');

      console.log('🔍 Debug: Sending verification email');
      await this.sendVerificationEmail(email, student.firstName, verificationToken);
      console.log('✅ Debug: Verification email sent successfully');

      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('❌ Debug: Resend verification error:', error);
      return {
        success: false,
        message: 'Failed to resend verification email'
      };
    }
  }

  // Complete student registration after payment
  static async completeStudentRegistration(registrationData: any): Promise<AuthResponse> {
    try {
      console.log('🔍 Debug: Completing student registration after payment');
      
      // Generate a unique profileUrl
      let baseSlug = (registrationData.firstName + '-' + registrationData.lastName)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      let profileUrl = baseSlug + '-' + Math.random().toString(36).substring(2, 8);
      // Optionally, check for uniqueness in DB (for extra safety)
      let suffix = 1;
      while (await prisma.student.findUnique({ where: { profileUrl } })) {
        profileUrl = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}-${suffix++}`;
      }

      // Create the actual student record
      const student = await prisma.student.create({
        data: {
          userId: uuidv4(),
          email: registrationData.email,
          passwordHash: registrationData.passwordHash,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          schoolName: registrationData.schoolName,
          major: registrationData.major,
          profileUrl,
          registrationStatus: 'verified',
          registrationPaid: true,
          verified: false // Students must be manually verified by admin
        }
      });

      console.log('✅ Debug: Student record created with ID:', student.id);

      // Generate tokens for the newly created student
      const payload: JWTTokenPayload = {
        id: student.id,
        email: student.email,
        userType: 'student',
        verified: false // Use actual verification status
      };

      const token = JWTUtils.generateToken(payload);
      const refreshToken = JWTUtils.generateRefreshToken(payload);

      return {
        success: true,
        message: 'Student registration completed successfully!',
        token,
        refreshToken,
        user: {
          id: student.id,
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          userType: 'student',
          verified: false // Correct: student is not verified until admin action
        },
        expiresIn: JWTUtils.getTokenExpiration()
      };
    } catch (error) {
      console.error('❌ Debug: Complete registration error:', error);
      return {
        success: false,
        message: 'Failed to complete registration. Please try again.'
      };
    }
  }

  // OTP verification - NEW method for direct OTP verification
  static async verifyOtp(email: string, otp: string, userType: string): Promise<AuthResponse> {
    try {
      console.log('🔍 Debug: OTP verification request received');
      console.log('🔍 Debug: Verifying OTP for:', { email, userType, otp });

      if (otp.length !== 6 || !/^[0-9]{6}$/.test(otp)) {
        console.log('❌ Debug: Invalid OTP format:', otp);
        return {
          success: false,
          message: 'Invalid verification code. Please enter the 6-digit code from your email.'
        };
      }

      // Check OTP in EmailOtp table
      const otpRecord = await prisma.emailOtp.findUnique({
        where: { email_userType: { email, userType } }
      });
      if (!otpRecord || otpRecord.code !== otp) {
        console.log('❌ Debug: OTP does not match or not found');
        return {
          success: false,
          message: 'Incorrect or expired verification code.'
        };
      }
      if (otpRecord.expiresAt < new Date()) {
        console.log('❌ Debug: OTP expired');
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        };
      }

      // OTP is valid, delete it
      await prisma.emailOtp.delete({ where: { email_userType: { email, userType } } });

      if (userType === 'student') {
        // Check if student exists in database (should not exist yet with new flow)
        const existingStudent = await prisma.student.findUnique({
          where: { email }
        });

        if (existingStudent) {
          console.log('🔍 Debug: Student already exists, updating verification status');
          // Student exists (legacy case), update verification status
          const student = await prisma.student.update({
            where: { email },
            data: { registrationStatus: 'verified' }
          });

          return {
            success: true,
            message: 'Email verified successfully. You can now log in.',
            user: {
              id: student.id,
              email: student.email,
              firstName: student.firstName,
              lastName: student.lastName,
              userType: 'student',
              verified: true
            }
          };
        } else {
          console.log('✅ Debug: Student not in database yet (new flow), verification successful');
          // Student doesn't exist yet (new flow), verification is successful
          // The actual student record will be created after payment
          
          // Generate a temporary auth token for payment processing
          const tempToken = JWTUtils.generateToken({
            id: `temp_${email}`, // Temporary ID for token generation
            email,
            userType: 'student',
            verified: false
          });
          
          return {
            success: true,
            message: 'Email verified successfully. Please complete payment to finish registration.',
            requiresPayment: true,
            token: tempToken // Add the auth token
          };
        }
      } else {
        console.log('❌ Debug: Invalid user type for verification:', userType);
        return {
          success: false,
          message: 'Invalid user type for verification'
        };
      }
    } catch (error) {
      console.error('❌ Debug: OTP verification error:', error);
      return {
        success: false,
        message: 'Email verification failed. Please try again.'
      };
    }
  }

  // Helper methods
  private static generateProfileUrl(firstName: string, lastName: string): string {
    const base = (firstName + '-' + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return base + '-' + Math.random().toString(36).substring(2, 8);
  }

  private static async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    // Always generate a 6-digit numeric OTP for development/testing
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔍 Debug: Generated OTP:', otp);

    // Store OTP in EmailOtp table with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await prisma.emailOtp.upsert({
      where: { email_userType: { email, userType: 'student' } },
      update: { code: otp, expiresAt },
      create: { email, code: otp, userType: 'student', expiresAt },
    });

    const subject = '🎓 Your Village Platform Verification Code';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Village Platform, ${firstName}!</h1>
        <p>Thank you for registering with Village Platform. To complete your registration, please use the verification code below.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="color: #2563eb; margin: 0;">Your Verification Code</h2>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${otp}</p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What's Next?</h3>
          <ul>
            <li>Enter the verification code above</li>
            <li>Complete your profile</li>
            <li>Add items to your registry</li>
            <li>Start receiving donations!</li>
          </ul>
        </div>

        <p>This verification code will expire in 10 minutes.</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    console.log('🔍 Debug: Sending verification email with OTP');
    
    try {
      // Use the properly configured SES service
      const { SESService } = require('./aws/sesService');
      const sesService = new SESService();
      
      await sesService.sendEmail(
        email,
        subject,
        htmlBody,
        `Welcome to Village Platform! Your verification code is: ${otp}`
      );
      
      console.log('✅ Email sent successfully via SES service');
      console.log('🎯 OTP Code for testing:', otp);
    } catch (error) {
      console.error('❌ Failed to send email via SES service:', error);
      console.log('📧 Debug: For testing purposes, OTP is:', otp);
      console.log('📧 Debug: Email would be sent to:', email);
      console.log('📧 Debug: Subject:', subject);
      
      // For development/testing, we'll continue without sending email
      // In production, this should throw an error
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  private static async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const subject = '🔒 Reset Your Village Platform Password';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Password Reset Request</h1>
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password for your Village Platform account.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>

        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>Security Notice:</strong></p>
          <ul style="margin: 10px 0;">
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Never share this link with anyone</li>
          </ul>
        </div>

        <p>If you're having trouble, contact our support team.</p>
        <p>Best regards,<br><strong>The Village Team</strong></p>
      </div>
    `;

    await sesService.sendEmail(email, subject, htmlBody);
  }
}