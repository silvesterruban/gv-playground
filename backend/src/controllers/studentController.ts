import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StripeService } from '../services/payment/stripeService';
import { JWTUtils } from '../utils/jwtUtils';
import { sendEmail } from '../utils/emailService';

const prisma = new PrismaClient();

export class StudentController {
  static async verifySchool(req: Request, res: Response) {
    try {
      const studentId = req.user?.id || req.body.studentId;
      if (!studentId) {
        console.log('DEBUG: Missing studentId');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - Student ID required',
        });
      }

      const { schoolId, verificationMethod, verificationEmail } = req.body;

      if (!schoolId || !verificationMethod) {
        console.log('DEBUG: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      if (verificationMethod === 'email' && !verificationEmail) {
        console.log('DEBUG: Missing verificationEmail for email method');
        return res.status(400).json({
          success: false,
          message: 'Verification email is required when using email verification method',
        });
      }

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        console.log('DEBUG: Student not found');
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Check if school exists
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      });

      if (!school) {
        console.log('DEBUG: School not found');
        return res.status(404).json({
          success: false,
          message: 'School not found',
        });
      }

      // Check if verification method is supported
      if (!school.verificationMethods.includes(verificationMethod)) {
        console.log('DEBUG: Unsupported verification method');
        return res.status(400).json({
          success: false,
          message: 'Verification method not supported by school',
        });
      }

      // Check if verification request already exists
      const existingVerification = await prisma.schoolVerification.findFirst({
        where: { studentId },
      });

      if (existingVerification) {
        console.log('DEBUG: Verification already exists');
        return res.status(400).json({
          success: false,
          message: 'A verification request already exists for this student',
        });
      }

      // Create verification request
      const verification = await prisma.schoolVerification.create({
        data: {
          schoolId,
          studentId,
          verificationMethod,
          verificationEmail: verificationMethod === 'email' ? verificationEmail : null,
          status: 'pending',
        },
      });

      console.log('DEBUG: Verification created', verification);

      // Send verification email if method is email
      if (verificationMethod === 'email' && verificationEmail) {
        await sendEmail({
          to: verificationEmail,
          subject: 'School Verification Request',
          text: `Please verify your student status by clicking the following link: ${process.env.FRONTEND_URL}/verify-school/${verification.id}`,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'School verification request submitted successfully',
        data: verification,
      });
    } catch (error) {
      console.error('Error in verifySchool:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit school verification request',
      });
    }
  }

  static async processRegistrationFee(req: Request, res: Response) {
    try {
      const { paymentMethodId } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Create payment intent
      const paymentIntent = await StripeService.createPaymentIntent({
        amount: 2500, // $25.00 in cents
        currency: 'usd',
        paymentMethodId,
        metadata: {
          studentId,
          purpose: 'registration_fee',
        },
      });

      return res.json({
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        },
      });
    } catch (error) {
      console.error('Error in processRegistrationFee:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process registration fee',
      });
    }
  }

  static async confirmRegistrationFee(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Confirm payment
      const payment = await StripeService.confirmPayment(paymentIntentId);

      if (payment.status === 'succeeded') {
        // Update student status
        const student = await prisma.student.update({
          where: { id: studentId },
          data: { registrationPaid: true },
        });

        return res.json({
          success: true,
          message: 'Registration fee payment confirmed',
          data: student,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
        data: { status: payment.status },
      });
    } catch (error) {
      console.error('Error in confirmRegistrationFee:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to confirm registration fee payment',
      });
    }
  }

  static async requestWelcomeBox(req: Request, res: Response) {
    try {
      const { shippingAddress } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Check if student has paid registration fee
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student?.registrationPaid) {
        return res.status(400).json({
          success: false,
          message: 'Registration fee must be paid before requesting welcome box',
        });
      }

      // Check if welcome box request already exists
      const existingRequest = await prisma.welcomeBox.findFirst({
        where: { studentId },
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'A welcome box request already exists for this student',
        });
      }

      // Create welcome box request
      const welcomeBox = await prisma.welcomeBox.create({
        data: {
          studentId,
          status: 'pending',
          shippingAddress,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Welcome box request submitted successfully',
        data: welcomeBox,
      });
    } catch (error) {
      console.error('Error in requestWelcomeBox:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit welcome box request',
      });
    }
  }

  static async updateWelcomeBoxStatus(req: Request, res: Response) {
    try {
      const { welcomeBoxId, status, trackingNumber } = req.body;

      const welcomeBox = await prisma.welcomeBox.update({
        where: { id: welcomeBoxId },
        data: {
          status,
          trackingNumber,
        },
      });

      return res.json({
        success: true,
        message: 'Welcome box status updated successfully',
        data: welcomeBox,
      });
    } catch (error) {
      console.error('Error in updateWelcomeBoxStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update welcome box status',
      });
    }
  }

  static async getWelcomeBoxStatus(req: Request, res: Response) {
    try {
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const welcomeBox = await prisma.welcomeBox.findFirst({
        where: { studentId },
      });

      if (!welcomeBox) {
        return res.status(404).json({
          success: false,
          message: 'No welcome box request found',
        });
      }

      return res.status(200).json({
        success: true,
        data: welcomeBox,
      });
    } catch (error) {
      console.error('Error in getWelcomeBoxStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get welcome box status',
      });
    }
  }
} 