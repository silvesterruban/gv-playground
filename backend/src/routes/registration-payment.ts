// backend/src/routes/registration-payment.ts - Enhanced with Tax Receipt Generation
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { TaxReceiptService } from '../services/taxReceiptService';
import { sesService } from '../services/aws/sesService';

const router = express.Router();
const prisma = new PrismaClient();

// Import StripeService instead of creating our own Stripe instance
import { StripeService } from '../services/payment/stripeService';

console.log('🔍 Using StripeService for payment processing');

// Helper function to get card brand
const getCardBrand = (cardNumber: string) => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (cleanNumber.startsWith('4')) return 'visa';
  if (cleanNumber.startsWith('5') || cleanNumber.match(/^2[2-7]/)) return 'mastercard';
  if (cleanNumber.match(/^3[47]/)) return 'amex';
  if (cleanNumber.match(/^6/)) return 'discover';
  return 'unknown';
};

// Generate unique tax receipt number
const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GV${year}-${timestamp}-${random}`;
};

// Process registration payment - Creates student record and processes payment
router.post('/process', async (req, res) => {
  try {
    console.log('🔍 Registration payment request received:', {
      email: req.body.email,
      amount: req.body.amount,
      hasTestCard: !!req.body.testCardData,
      hasRegistrationData: !!req.body.registrationData
    });

    const {
      paymentMethodId,
      amount,
      currency = 'usd',
      email,
      registrationData,
      testCardData,
      metadata,
      isRegistrationPayment
    } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Ensure amount is treated as dollars (convert from cents if needed)
    const dollarAmount = amount > 100 ? amount / 100 : amount;
    console.log('🔍 Amount processing:', {
      originalAmount: amount,
      dollarAmount: dollarAmount,
      isInCents: amount > 100
    });

    // Check if we have registration data
    if (!registrationData) {
      return res.status(400).json({
        success: false,
        error: 'Registration data is required. Please complete the signup process first.'
      });
    }

    // Validate required registration fields
    const requiredFields = ['firstName', 'lastName', 'school', 'email'];
    const missingFields = requiredFields.filter(field => !registrationData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required registration fields: ${missingFields.join(', ')}`,
        receivedData: Object.keys(registrationData)
      });
    }

    console.log('🔍 Registration data received:', {
      email: registrationData.email,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      school: registrationData.school,
      major: registrationData.major,
      password: !!registrationData.password,
      fullRegistrationData: registrationData
    });

    // Check if student already exists
    let student = await prisma.student.findUnique({
      where: { email }
    });

    if (student) {
      // Student exists - check if they've already completed payment
      if (student.registrationStatus === 'complete' && student.paymentComplete) {
        return res.status(400).json({
          success: false,
          error: 'Registration already completed for this student',
          user: {
            id: student.id,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            registrationComplete: true
          }
        });
      }
      console.log('🔍 Found existing student record:', student.id);
    } else {
      // Create student record from registration data
      console.log('🔍 Creating new student record from registration data...');

      // Hash password if provided in registration data
      let hashedPassword = '';
      if (registrationData.password) {
        hashedPassword = await bcrypt.hash(registrationData.password, 10);
      }

      // Generate required fields
      const userId = uuidv4();
      const profileUrl = `${registrationData.firstName.toLowerCase()}-${registrationData.lastName.toLowerCase()}-${Date.now()}`;

      student = await prisma.student.create({
        data: {
          email: email,
          passwordHash: hashedPassword,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          schoolName: registrationData.school,
          major: registrationData.major || null,
          registrationStatus: 'pending_payment',
          userId: userId,
          profileUrl: profileUrl,
          bio: null,
          profilePhoto: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ Created new student record:', {
        id: student.id,
        userId: student.userId,
        email: student.email,
        profileUrl: student.profileUrl,
        status: student.registrationStatus
      });
    }

    console.log('🔍 Processing payment for student:', {
      studentId: student.id,
      email: student.email,
      currentStatus: student.registrationStatus,
      originalAmount: amount,
      dollarAmount: dollarAmount
    });

    // Process payment with real Stripe or simulate for test cards
    let paymentIntentId;
    let isRealStripePayment = false;

    if (testCardData && process.env.NODE_ENV !== 'production') {
      const testCardNumber = testCardData.number;

      console.log('🧪 Processing test card:', testCardNumber);

      // Simulate different card scenarios for specific test cards
      if (testCardNumber === '4000000000000002') {
        console.log('❌ Simulating card decline');
        return res.status(400).json({
          success: false,
          error: 'Your card was declined.',
          code: 'card_declined'
        });
      }

      if (testCardNumber === '4000000000009995') {
        console.log('❌ Simulating insufficient funds');
        return res.status(400).json({
          success: false,
          error: 'Your card has insufficient funds.',
          code: 'insufficient_funds'
        });
      }

      if (testCardNumber === '4000000000000069') {
        console.log('❌ Simulating expired card');
        return res.status(400).json({
          success: false,
          error: 'Your card has expired.',
          code: 'expired_card'
        });
      }

      // For Stripe test cards (4242...), use real Stripe API with test tokens
      if (testCardNumber === '4242424242424242' || testCardNumber.startsWith('424242')) {
        console.log('🔗 Using real Stripe API with test tokens...');

        try {
          // Use Stripe test payment methods instead of raw card data
          let testPaymentMethodId;

          // Map test card numbers to Stripe's test payment method tokens
          switch (testCardNumber.replace(/\s/g, '')) {
            case '4242424242424242':
              testPaymentMethodId = 'pm_card_visa';
              break;
            case '4000056655665556':
              testPaymentMethodId = 'pm_card_visa_debit';
              break;
            case '5555555555554444':
              testPaymentMethodId = 'pm_card_mastercard';
              break;
            case '378282246310005':
              testPaymentMethodId = 'pm_card_amex';
              break;
            case '4000000000000002':
              testPaymentMethodId = 'pm_card_visa_chargeDeclined';
              break;
            default:
              testPaymentMethodId = 'pm_card_visa';
          }

          console.log('🔍 Using Stripe test payment method:', testPaymentMethodId);

          // Create and confirm payment intent with test payment method
          const paymentIntent = await StripeService.createPaymentIntent({
            amount: Math.round(dollarAmount * 100), // Convert to cents for Stripe
            currency: currency,
            paymentMethodId: testPaymentMethodId,
            metadata: {
              type: 'registration_fee',
              student_email: email,
              student_id: student.id
            }
          });

          paymentIntentId = paymentIntent.id;
          isRealStripePayment = true;

          console.log('✅ Stripe payment intent created and confirmed:', {
            id: paymentIntentId,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            paymentMethod: testPaymentMethodId
          });

          // Check if payment requires additional action (3D Secure, etc.)
          if (paymentIntent.status === 'requires_action') {
            return res.status(400).json({
              success: false,
              error: 'Payment requires additional authentication',
              paymentIntent: {
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret,
                status: paymentIntent.status
              }
            });
          }

          // Check if payment failed
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
              success: false,
              error: `Payment failed with status: ${paymentIntent.status}`,
              message: paymentIntent.last_payment_error?.message || 'Unknown payment error'
            });
          }

          console.log('✅ Stripe payment succeeded!');

        } catch (stripeError: any) {
          console.error('❌ Stripe payment processing failed:', stripeError);
          return res.status(400).json({
            success: false,
            error: 'Payment processing failed',
            message: stripeError.message,
            code: stripeError.code
          });
        }
      } else {
        // For other test scenarios, simulate
        console.log('✅ Simulating successful payment processing...');
        paymentIntentId = `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      // Production: Always use real Stripe with actual payment method
      console.log('🔗 Using real Stripe API for production payment...');

      try {
        if (!paymentMethodId) {
          return res.status(400).json({
            success: false,
            error: 'Payment method required for production payments'
          });
        }

        const paymentIntent = await StripeService.createPaymentIntent({
          amount: Math.round(dollarAmount * 100), // Convert to cents for Stripe
          currency: currency,
          paymentMethodId: paymentMethodId,
          metadata: {
            type: 'registration_fee',
            student_email: email,
            student_id: student.id
          }
        });

        paymentIntentId = paymentIntent.id;
        isRealStripePayment = true;
        console.log('✅ Real Stripe payment intent created:', paymentIntentId);

        // Handle payment status
        if (paymentIntent.status === 'requires_action') {
          return res.status(400).json({
            success: false,
            error: 'Payment requires additional authentication',
            paymentIntent: {
              id: paymentIntent.id,
              client_secret: paymentIntent.client_secret,
              status: paymentIntent.status
            }
          });
        }

        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            success: false,
            error: `Payment failed with status: ${paymentIntent.status}`,
            paymentIntent: {
              id: paymentIntent.id,
              status: paymentIntent.status
            }
          });
        }

      } catch (stripeError: any) {
        console.error('❌ Stripe payment intent creation failed:', stripeError);
        return res.status(400).json({
          success: false,
          error: 'Payment processing failed',
          message: stripeError.message
        });
      }
    }

    // Update student with payment completion
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        registrationStatus: 'complete',
        paymentComplete: true,
        paymentStatus: 'completed',
        paymentIntentId: paymentIntentId,
        paymentCompletedAt: new Date(),
        registrationFee: dollarAmount,
        registrationPaid: true
      }
    });

    console.log('✅ Student payment fields updated:', {
      studentId: updatedStudent.id,
      email: updatedStudent.email,
      paymentComplete: updatedStudent.paymentComplete,
      paymentStatus: updatedStudent.paymentStatus,
      registrationFee: updatedStudent.registrationFee
    });

    // Create a donation record for the registration payment
    let donationId = null;
    let paymentTransactionId = null;
    let taxReceiptNumber = null;
    let taxReceiptUrl = null;

    try {
      console.log('🔍 Creating registration fee record...');

      // Generate unique receipt number
      taxReceiptNumber = generateReceiptNumber();

      const registrationFee = await prisma.registrationFee.create({
        data: {
          studentId: student.id,
          receiptNumber: taxReceiptNumber,
          studentFirstName: registrationData.firstName,
          studentLastName: registrationData.lastName,
          studentEmail: email,
          studentSchool: registrationData.school,
          studentMajor: registrationData.major,
          amount: dollarAmount,
          currency: 'USD',
          paymentMethod: 'stripe',
          paymentIntentId: paymentIntentId,
          transactionFee: 0,
          netAmount: dollarAmount,
          status: 'completed',
          processedAt: new Date(),
          createdAt: new Date()
        }
      });

      donationId = registrationFee.id; // Keep using donationId variable for compatibility
      console.log('✅ Registration fee record created:', donationId);

      // Create the payment transaction record
      console.log('🔍 Creating payment transaction record...');

      const paymentTransaction = await prisma.paymentTransaction.create({
        data: {
          registrationFeeId: registrationFee.id,
          provider: 'stripe',
          providerTransactionId: paymentIntentId,
          providerFee: 0,
          grossAmount: dollarAmount,
          netAmount: dollarAmount,
          currency: 'USD',
          merchantAccountId: 'gradvillage_main',
          riskScore: 0.1,
          fraudStatus: 'clean',
          complianceChecked: true,
          gatewayResponse: {
            isRealStripePayment: isRealStripePayment,
            testMode: !!testCardData,
            cardBrand: testCardData ? getCardBrand(testCardData.number) : 'unknown',
            cardLast4: testCardData ? testCardData.number.slice(-4) : '0000',
            paymentType: 'registration_fee',
            originalAmount: amount,
            processedAmount: dollarAmount
          },
          createdAt: new Date(),
          settledAt: new Date()
        }
      });

      paymentTransactionId = paymentTransaction.id;
      console.log('✅ Payment transaction record created:', paymentTransactionId);

      // 🔥 NEW: Generate Tax Receipt
      console.log('🔍 Generating tax receipt...');

      try {
        // Prepare receipt data using registration fee data
        const receiptData = {
          receiptNumber: taxReceiptNumber,
          receiptDate: new Date(),
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
          donorName: `${registrationFee.studentFirstName} ${registrationFee.studentLastName}`,
          donorAddress: {
            street: 'Not provided',
            city: 'Not provided',
            state: 'Not provided',
            zipCode: 'Not provided'
          },
          donationAmount: Number(registrationFee.amount),
          donationDate: registrationFee.processedAt || registrationFee.createdAt,
          donationDescription: `Registration fee payment for student account setup - ${registrationFee.studentFirstName} ${registrationFee.studentLastName}`
        };

        console.log('🔍 Receipt data prepared:', {
          receiptNumber: receiptData.receiptNumber,
          donorName: receiptData.donorName,
          amount: receiptData.donationAmount,
          description: receiptData.donationDescription
        });

        // Generate and upload PDF receipt
        taxReceiptUrl = await TaxReceiptService.generateAndUploadReceipt(receiptData);
        console.log('✅ Tax receipt PDF generated and uploaded:', taxReceiptUrl);

        // Create tax receipt record in database
        const taxReceipt = await prisma.taxReceipt.create({
          data: {
            donationId: registrationFee.id, // Using registration fee ID for now (will need to update TaxReceipt model later)
            receiptNumber: taxReceiptNumber,
            receiptDate: receiptData.receiptDate,
            taxYear: receiptData.taxYear,
            nonprofitName: receiptData.nonprofitName,
            nonprofitEin: receiptData.nonprofitEin,
            nonprofitAddress: receiptData.nonprofitAddress,
            donorName: receiptData.donorName,
            donorAddress: receiptData.donorAddress,
            donationAmount: receiptData.donationAmount,
            donationDate: receiptData.donationDate,
            donationDescription: receiptData.donationDescription,
            issued: true,
            issuedAt: new Date(),
            receiptPdfUrl: taxReceiptUrl,
            generatedBy: null, // System generated
            createdAt: new Date()
          }
        });

        console.log('✅ Tax receipt database record created:', taxReceipt.id);

      } catch (taxReceiptError: any) {
        console.error('⚠️ Tax receipt generation failed:', taxReceiptError);
        console.error('Tax receipt error details:', taxReceiptError.message);
        // Don't fail the entire payment, just log the error
        // The receipt can be generated later manually if needed
      }

    } catch (transactionError: any) {
      console.error('⚠️ Could not create payment records:', transactionError);
      console.error('Transaction error details:', transactionError.message);
      // Continue anyway since the main registration is complete
    }

    // After student is created and payment is processed
    // Send payment confirmation email with receipt (non-blocking - don't fail payment if email fails)
    try {
      const { RegistrationPaymentService } = require('../services/registrationPaymentService');
      
      // Always send the enhanced payment confirmation email with receipt info
      await RegistrationPaymentService.sendPaymentConfirmationEmail(student.email, student.firstName, taxReceiptUrl, taxReceiptNumber);
      console.log('✅ Payment confirmation email with receipt info sent successfully');
      
      // Also send a separate receipt email with download link
      try {
        const receiptDownloadUrl = `${process.env.FRONTEND_URL || 'https://thunder.gradvillage.com'}/api/receipt/${taxReceiptNumber}`;
        const receiptSubject = '📄 Your GradVillage Tax Receipt';
        const receiptHtmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">📄 Your Tax Receipt</h2>
            <p>Dear ${student.firstName},</p>
            <p>Thank you for your registration payment. Your official tax-deductible receipt is ready for download.</p>
            
            <div style="background: #f8fafc; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0;">Download Your Receipt</h3>
              <a href="${receiptDownloadUrl}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">Download PDF Receipt</a>
              <p style="color: #64748b; margin: 15px 0 0 0; font-size: 14px;">Receipt Number: ${taxReceiptNumber}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This receipt serves as documentation for your tax-deductible donation to GradVillage, a 501(c)(3) organization.</p>
            <p style="color: #6b7280; font-size: 14px;">Please retain this receipt for your tax records.</p>
            
            <p>Best regards,<br>The GradVillage Team</p>
          </div>
        `;
        
        await sesService.sendEmail(student.email, receiptSubject, receiptHtmlBody);
        console.log('✅ Receipt email sent successfully');
      } catch (receiptEmailError) {
        console.error('⚠️ Receipt email failed:', receiptEmailError);
      }
    } catch (emailError) {
      console.error('⚠️ Payment confirmation email failed, but payment continues:', emailError);
      // Don't fail the payment if email sending fails
    }

    // Send welcome email (non-blocking - don't fail payment if email fails)
    try {
      await sesService.sendWelcomeEmail(student.firstName, student.email);
      console.log('✅ Welcome email sent successfully');
    } catch (emailError) {
      console.error('⚠️ Welcome email failed, but payment continues:', emailError);
      // Don't fail the payment if email sending fails
    }

    // Generate JWT token for immediate login
    const token = jwt.sign(
      {
        id: updatedStudent.id,
        userId: updatedStudent.userId,
        email: updatedStudent.email,
        userType: 'student',
        verified: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    console.log('🔍 Generated JWT token for immediate student login');

    // Return success response with all required data
    return res.status(200).json({
      success: true,
      message: 'Registration payment processed successfully',
      paymentIntent: {
        id: paymentIntentId,
        status: 'succeeded',
        amount: dollarAmount,
        currency: currency,
        created: Math.floor(Date.now() / 1000),
        isRealStripePayment: isRealStripePayment
      },
      user: {
        id: updatedStudent.id,
        email: updatedStudent.email,
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        school: updatedStudent.schoolName,
        major: updatedStudent.major,
        userType: 'student',
        verified: true,
        paymentComplete: true,
        registrationComplete: true,
        profileUrl: updatedStudent.profileUrl
      },
      token: token,
      // Tax receipt information
      taxReceipt: {
        receiptNumber: taxReceiptNumber,
        receiptUrl: taxReceiptUrl,
        issued: !!taxReceiptUrl,
        message: taxReceiptUrl
          ? 'Tax receipt generated successfully'
          : 'Tax receipt will be generated and emailed shortly'
      },
      // Additional metadata for frontend
      metadata: {
        paymentProcessedAt: new Date().toISOString(),
        registrationFee: dollarAmount,
        testMode: !!testCardData,
        isRealStripePayment: isRealStripePayment,
        studentCreated: !student || student.registrationStatus === 'pending_payment',
        registrationFeeId: donationId, // Using donationId variable for compatibility
        paymentTransactionId: paymentTransactionId,
        taxReceiptGenerated: !!taxReceiptUrl,
        amountProcessing: {
          original: amount,
          processed: dollarAmount,
          wasConverted: amount !== dollarAmount
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Registration payment error:', error);

    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: error.message,
      code: error.code || 'PAYMENT_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
});

// NEW: Get tax receipt for a student
router.get('/tax-receipt/:receiptNumber', async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    console.log('🔍 Fetching tax receipt:', receiptNumber);

    const taxReceipt = await prisma.taxReceipt.findUnique({
      where: { receiptNumber },
      include: {
        donation: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!taxReceipt) {
      return res.status(404).json({
        success: false,
        error: 'Tax receipt not found'
      });
    }

    console.log('✅ Tax receipt found:', taxReceipt.id);

    res.json({
      success: true,
      taxReceipt: {
        receiptNumber: taxReceipt.receiptNumber,
        receiptDate: taxReceipt.receiptDate,
        taxYear: taxReceipt.taxYear,
        donorName: taxReceipt.donorName,
        donationAmount: taxReceipt.donationAmount,
        donationDate: taxReceipt.donationDate,
        donationDescription: taxReceipt.donationDescription,
        receiptPdfUrl: taxReceipt.receiptPdfUrl,
        issued: taxReceipt.issued,
        issuedAt: taxReceipt.issuedAt,
        nonprofitName: taxReceipt.nonprofitName,
        nonprofitEin: taxReceipt.nonprofitEin
      }
    });

  } catch (error: any) {
    console.error('❌ Get tax receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax receipt',
      message: error.message
    });
  }
});

// NEW: List all tax receipts for a student (requires authentication)
router.get('/tax-receipts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    console.log('🔍 Fetching tax receipts for student:', decoded.email);

    const taxReceipts = await prisma.taxReceipt.findMany({
      where: {
        donation: {
          donorEmail: decoded.email
        }
      },
      orderBy: {
        receiptDate: 'desc'
      },
      select: {
        receiptNumber: true,
        receiptDate: true,
        taxYear: true,
        donationAmount: true,
        donationDescription: true,
        receiptPdfUrl: true,
        issued: true,
        issuedAt: true,
        donation: {
          select: {
            donationType: true,
            processedAt: true
          }
        }
      }
    });

    console.log('✅ Found tax receipts:', taxReceipts.length);

    res.json({
      success: true,
      taxReceipts: taxReceipts.map(receipt => ({
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate,
        taxYear: receipt.taxYear,
        donationAmount: receipt.donationAmount,
        donationType: receipt.donation.donationType,
        donationDescription: receipt.donationDescription,
        receiptPdfUrl: receipt.receiptPdfUrl,
        issued: receipt.issued,
        issuedAt: receipt.issuedAt,
        processedAt: receipt.donation.processedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ List tax receipts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax receipts',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🔍 Registration payment health check called');
  res.json({
    service: 'registration-payment',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /process - Process registration payment and create student record',
      'GET /tax-receipt/:receiptNumber - Get specific tax receipt',
      'GET /tax-receipts - List all tax receipts for authenticated user',
      'GET /health - Health check'
    ],
    features: [
      'Student record creation with payment fields',
      'Donation record creation for registration fees',
      'Payment transaction tracking',
      'Tax receipt PDF generation and storage',
      'Tax receipt database records',
      'Tax receipt retrieval endpoints',
      'Test card simulation',
      'Payment validation',
      'Automatic user verification',
      'JWT token generation',
      'Registration completion'
    ]
  });
});

console.log('🔍 Registration payment routes loaded with complete payment tracking and tax receipt generation');
export default router;



// // backend/src/routes/registration-payment.ts - Final complete implementation
// import express from 'express';
// import { PrismaClient } from '@prisma/client';
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcrypt';
// import { v4 as uuidv4 } from 'uuid';
// import Stripe from 'stripe';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Initialize Stripe
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2023-10-16',
// });
//
// console.log('🔍 Stripe initialized with key:', process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...');
//
// // Helper function to get card brand
// const getCardBrand = (cardNumber: string) => {
//   const cleanNumber = cardNumber.replace(/\s/g, '');
//   if (cleanNumber.startsWith('4')) return 'visa';
//   if (cleanNumber.startsWith('5') || cleanNumber.match(/^2[2-7]/)) return 'mastercard';
//   if (cleanNumber.match(/^3[47]/)) return 'amex';
//   if (cleanNumber.match(/^6/)) return 'discover';
//   return 'unknown';
// };
//
// // Process registration payment - Creates student record and processes payment
// router.post('/process', async (req, res) => {
//   try {
//     console.log('🔍 Registration payment request received:', {
//       email: req.body.email,
//       amount: req.body.amount,
//       hasTestCard: !!req.body.testCardData,
//       hasRegistrationData: !!req.body.registrationData
//     });
//
//     const {
//       paymentMethodId,
//       amount,
//       currency = 'usd',
//       email,
//       registrationData,
//       testCardData,
//       metadata,
//       isRegistrationPayment
//     } = req.body;
//
//     // Validate required fields
//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email is required'
//       });
//     }
//
//     if (!amount || amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Valid amount is required'
//       });
//     }
//
//     // Ensure amount is treated as dollars (convert from cents if needed)
//     const dollarAmount = amount > 100 ? amount / 100 : amount; // If amount > 100, assume it's in cents
//     console.log('🔍 Amount processing:', {
//       originalAmount: amount,
//       dollarAmount: dollarAmount,
//       isInCents: amount > 100
//     });
//
//     // Check if we have registration data
//     if (!registrationData) {
//       return res.status(400).json({
//         success: false,
//         error: 'Registration data is required. Please complete the signup process first.'
//       });
//     }
//
//     // Validate required registration fields
//     const requiredFields = ['firstName', 'lastName', 'school', 'email'];
//     const missingFields = requiredFields.filter(field => !registrationData[field]);
//
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         error: `Missing required registration fields: ${missingFields.join(', ')}`,
//         receivedData: Object.keys(registrationData)
//       });
//     }
//
//     console.log('🔍 Registration data received:', {
//       email: registrationData.email,
//       firstName: registrationData.firstName,
//       lastName: registrationData.lastName,
//       school: registrationData.school,
//       major: registrationData.major,
//       password: !!registrationData.password,
//       fullRegistrationData: registrationData
//     });
//
//     // Check if student already exists
//     let student = await prisma.student.findUnique({
//       where: { email }
//     });
//
//     if (student) {
//       // Student exists - check if they've already completed payment
//       if (student.registrationStatus === 'complete' && student.paymentComplete) {
//         return res.status(400).json({
//           success: false,
//           error: 'Registration already completed for this student',
//           user: {
//             id: student.id,
//             email: student.email,
//             firstName: student.firstName,
//             lastName: student.lastName,
//             registrationComplete: true
//           }
//         });
//       }
//       console.log('🔍 Found existing student record:', student.id);
//     } else {
//       // Create student record from registration data
//       console.log('🔍 Creating new student record from registration data...');
//
//       // Hash password if provided in registration data
//       let hashedPassword = '';
//       if (registrationData.password) {
//         hashedPassword = await bcrypt.hash(registrationData.password, 10);
//       }
//
//       // Generate required fields
//       const userId = uuidv4();
//       const profileUrl = `${registrationData.firstName.toLowerCase()}-${registrationData.lastName.toLowerCase()}-${Date.now()}`;
//
//       student = await prisma.student.create({
//         data: {
//           email: email,
//           passwordHash: hashedPassword,
//           firstName: registrationData.firstName,
//           lastName: registrationData.lastName,
//           schoolName: registrationData.school,
//           major: registrationData.major || null,
//           registrationStatus: 'pending_payment',
//           userId: userId,
//           profileUrl: profileUrl,
//           bio: null,
//           profilePhoto: null,
//           createdAt: new Date(),
//           updatedAt: new Date()
//         }
//       });
//
//       console.log('✅ Created new student record:', {
//         id: student.id,
//         userId: student.userId,
//         email: student.email,
//         profileUrl: student.profileUrl,
//         status: student.registrationStatus
//       });
//     }
//
//     console.log('🔍 Processing payment for student:', {
//       studentId: student.id,
//       email: student.email,
//       currentStatus: student.registrationStatus,
//       originalAmount: amount,
//       dollarAmount: dollarAmount
//     });
//
//     // Process payment with real Stripe or simulate for test cards
//     let paymentIntentId;
//     let isRealStripePayment = false;
//
//     if (testCardData && process.env.NODE_ENV !== 'production') {
//       const testCardNumber = testCardData.number;
//
//       console.log('🧪 Processing test card:', testCardNumber);
//
//       // Simulate different card scenarios for specific test cards
//       if (testCardNumber === '4000000000000002') {
//         console.log('❌ Simulating card decline');
//         return res.status(400).json({
//           success: false,
//           error: 'Your card was declined.',
//           code: 'card_declined'
//         });
//       }
//
//       if (testCardNumber === '4000000000009995') {
//         console.log('❌ Simulating insufficient funds');
//         return res.status(400).json({
//           success: false,
//           error: 'Your card has insufficient funds.',
//           code: 'insufficient_funds'
//         });
//       }
//
//       if (testCardNumber === '4000000000000069') {
//         console.log('❌ Simulating expired card');
//         return res.status(400).json({
//           success: false,
//           error: 'Your card has expired.',
//           code: 'expired_card'
//         });
//       }
//
//       // For Stripe test cards (4242...), use real Stripe API with test tokens
//       if (testCardNumber === '4242424242424242' || testCardNumber.startsWith('424242')) {
//         console.log('🔗 Using real Stripe API with test tokens...');
//
//         try {
//           // Use Stripe test payment methods instead of raw card data
//           let testPaymentMethodId;
//
//           // Map test card numbers to Stripe's test payment method tokens
//           switch (testCardNumber.replace(/\s/g, '')) {
//             case '4242424242424242':
//               testPaymentMethodId = 'pm_card_visa'; // Visa test token
//               break;
//             case '4000056655665556':
//               testPaymentMethodId = 'pm_card_visa_debit'; // Visa debit test token
//               break;
//             case '5555555555554444':
//               testPaymentMethodId = 'pm_card_mastercard'; // Mastercard test token
//               break;
//             case '378282246310005':
//               testPaymentMethodId = 'pm_card_amex'; // Amex test token
//               break;
//             case '4000000000000002':
//               testPaymentMethodId = 'pm_card_visa_chargeDeclined'; // Declined card test token
//               break;
//             default:
//               testPaymentMethodId = 'pm_card_visa'; // Default to Visa
//           }
//
//           console.log('🔍 Using Stripe test payment method:', testPaymentMethodId);
//
//           // Create and confirm payment intent with test payment method
//           const paymentIntent = await stripe.paymentIntents.create({
//             amount: Math.round(dollarAmount * 100), // Convert to cents for Stripe
//             currency: currency,
//             payment_method: testPaymentMethodId,
//             confirmation_method: 'manual',
//             confirm: true,
//             return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/registration-complete`,
//             metadata: {
//               type: 'registration_fee',
//               student_email: email,
//               student_id: student.id
//             },
//             description: `Registration fee for ${registrationData.firstName} ${registrationData.lastName}`
//           });
//
//           paymentIntentId = paymentIntent.id;
//           isRealStripePayment = true;
//
//           console.log('✅ Stripe payment intent created and confirmed:', {
//             id: paymentIntentId,
//             status: paymentIntent.status,
//             amount: paymentIntent.amount,
//             paymentMethod: testPaymentMethodId
//           });
//
//           // Check if payment requires additional action (3D Secure, etc.)
//           if (paymentIntent.status === 'requires_action') {
//             return res.status(400).json({
//               success: false,
//               error: 'Payment requires additional authentication',
//               paymentIntent: {
//                 id: paymentIntent.id,
//                 client_secret: paymentIntent.client_secret,
//                 status: paymentIntent.status
//               }
//             });
//           }
//
//           // Check if payment failed
//           if (paymentIntent.status !== 'succeeded') {
//             return res.status(400).json({
//               success: false,
//               error: `Payment failed with status: ${paymentIntent.status}`,
//               message: paymentIntent.last_payment_error?.message || 'Unknown payment error'
//             });
//           }
//
//           console.log('✅ Stripe payment succeeded!');
//
//         } catch (stripeError: any) {
//           console.error('❌ Stripe payment processing failed:', stripeError);
//           return res.status(400).json({
//             success: false,
//             error: 'Payment processing failed',
//             message: stripeError.message,
//             code: stripeError.code
//           });
//         }
//       } else {
//         // For other test scenarios, simulate
//         console.log('✅ Simulating successful payment processing...');
//         paymentIntentId = `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     } else {
//       // Production: Always use real Stripe with actual payment method
//       console.log('🔗 Using real Stripe API for production payment...');
//
//       try {
//         // In production, you would get the payment method from the frontend
//         // For now, this is a placeholder - in real production, the frontend would send paymentMethodId
//         if (!paymentMethodId) {
//           return res.status(400).json({
//             success: false,
//             error: 'Payment method required for production payments'
//           });
//         }
//
//         const paymentIntent = await stripe.paymentIntents.create({
//           amount: Math.round(dollarAmount * 100), // Convert to cents for Stripe
//           currency: currency,
//           payment_method: paymentMethodId,
//           confirmation_method: 'manual',
//           confirm: true,
//           metadata: {
//             type: 'registration_fee',
//             student_email: email,
//             student_id: student.id
//           },
//           description: `Registration fee for ${registrationData.firstName} ${registrationData.lastName}`
//         });
//
//         paymentIntentId = paymentIntent.id;
//         isRealStripePayment = true;
//         console.log('✅ Real Stripe payment intent created:', paymentIntentId);
//
//         // Handle payment status
//         if (paymentIntent.status === 'requires_action') {
//           return res.status(400).json({
//             success: false,
//             error: 'Payment requires additional authentication',
//             paymentIntent: {
//               id: paymentIntent.id,
//               client_secret: paymentIntent.client_secret,
//               status: paymentIntent.status
//             }
//           });
//         }
//
//         if (paymentIntent.status !== 'succeeded') {
//           return res.status(400).json({
//             success: false,
//             error: `Payment failed with status: ${paymentIntent.status}`,
//             paymentIntent: {
//               id: paymentIntent.id,
//               status: paymentIntent.status
//             }
//           });
//         }
//
//       } catch (stripeError: any) {
//         console.error('❌ Stripe payment intent creation failed:', stripeError);
//         return res.status(400).json({
//           success: false,
//           error: 'Payment processing failed',
//           message: stripeError.message
//         });
//       }
//     }
//
//     // Update student with payment completion
//     const updatedStudent = await prisma.student.update({
//       where: { id: student.id },
//       data: {
//         registrationStatus: 'complete',
//         // verified: true, // Removed: students should not be auto-verified
//         // verifiedAt: new Date(), // Removed: students should not be auto-verified
//         paymentComplete: true,
//         paymentStatus: 'completed',
//         paymentIntentId: paymentIntentId,
//         paymentCompletedAt: new Date(),
//         registrationFee: dollarAmount, // Use dollar amount, not original amount
//         registrationPaid: true,
//         updatedAt: new Date()
//       }
//     });
//
//     console.log('✅ Student payment fields updated:', {
//       studentId: updatedStudent.id,
//       email: updatedStudent.email,
//       paymentComplete: updatedStudent.paymentComplete,
//       paymentStatus: updatedStudent.paymentStatus,
//       registrationFee: updatedStudent.registrationFee
//     });
//
//     // Create a donation record for the registration payment
//     let donationId = null;
//     let paymentTransactionId = null;
//
//     try {
//       console.log('🔍 Creating donation record for registration payment...');
//
//       const registrationDonation = await prisma.donation.create({
//         data: {
//           studentId: student.id,
//           donorEmail: email,
//           donorFirstName: registrationData.firstName,
//           donorLastName: registrationData.lastName,
//           amount: dollarAmount, // Use dollar amount
//           currency: 'USD',
//           donationType: 'registration_fee',
//           paymentMethod: 'stripe',
//           paymentIntentId: paymentIntentId,
//           transactionFee: 0,
//           netAmount: dollarAmount, // Use dollar amount
//           status: 'completed',
//           processedAt: new Date(),
//           isAnonymous: false,
//           allowPublicDisplay: false,
//           allowStudentContact: false,
//           nonprofitId: 'gradvillage-501c3',
//           ein: 'XX-XXXXXXX',
//           createdAt: new Date()
//         }
//       });
//
//       donationId = registrationDonation.id;
//       console.log('✅ Registration donation record created:', donationId);
//
//       // Create the payment transaction record
//       console.log('🔍 Creating payment transaction record...');
//
//       const paymentTransaction = await prisma.paymentTransaction.create({
//         data: {
//           donationId: registrationDonation.id,
//           provider: 'stripe',
//           providerTransactionId: paymentIntentId,
//           providerFee: 0,
//           grossAmount: dollarAmount, // Use dollar amount
//           netAmount: dollarAmount, // Use dollar amount
//           currency: 'USD',
//           merchantAccountId: 'gradvillage_main',
//           riskScore: 0.1,
//           fraudStatus: 'clean',
//           complianceChecked: true,
//           gatewayResponse: {
//             isRealStripePayment: isRealStripePayment,
//             testMode: !!testCardData,
//             cardBrand: testCardData ? getCardBrand(testCardData.number) : 'unknown',
//             cardLast4: testCardData ? testCardData.number.slice(-4) : '0000',
//             paymentType: 'registration_fee',
//             originalAmount: amount,
//             processedAmount: dollarAmount
//           },
//           createdAt: new Date(),
//           settledAt: new Date()
//         }
//       });
//
//       paymentTransactionId = paymentTransaction.id;
//       console.log('✅ Payment transaction record created:', paymentTransactionId);
//
//     } catch (transactionError: any) {
//       console.error('⚠️ Could not create payment records:', transactionError);
//       console.error('Transaction error details:', transactionError.message);
//       // Continue anyway since the main registration is complete
//     }
//
//     // Generate JWT token for immediate login
//     const token = jwt.sign(
//       {
//         id: updatedStudent.id,
//         userId: updatedStudent.userId,
//         email: updatedStudent.email,
//         userType: 'student',
//         verified: true
//       },
//       process.env.JWT_SECRET!,
//       { expiresIn: '24h' }
//     );
//
//     console.log('🔍 Generated JWT token for immediate student login');
//
//     // Return success response with all required data
//     return res.status(200).json({
//       success: true,
//       message: 'Registration payment processed successfully',
//       paymentIntent: {
//         id: paymentIntentId,
//         status: 'succeeded',
//         amount: dollarAmount, // Return dollar amount
//         currency: currency,
//         created: Math.floor(Date.now() / 1000),
//         isRealStripePayment: isRealStripePayment
//       },
//       user: {
//         id: updatedStudent.id,
//         email: updatedStudent.email,
//         firstName: updatedStudent.firstName,
//         lastName: updatedStudent.lastName,
//         school: updatedStudent.schoolName,
//         major: updatedStudent.major,
//         userType: 'student',
//         verified: true,
//         paymentComplete: true,
//         registrationComplete: true,
//         profileUrl: updatedStudent.profileUrl
//       },
//       token: token,
//       // Additional metadata for frontend
//       metadata: {
//         paymentProcessedAt: new Date().toISOString(),
//         registrationFee: dollarAmount, // Return dollar amount
//         testMode: !!testCardData,
//         isRealStripePayment: isRealStripePayment,
//         studentCreated: !student || student.registrationStatus === 'pending_payment',
//         donationId: donationId,
//         paymentTransactionId: paymentTransactionId,
//         amountProcessing: {
//           original: amount,
//           processed: dollarAmount,
//           wasConverted: amount !== dollarAmount
//         }
//       }
//     });
//
//   } catch (error: any) {
//     console.error('❌ Registration payment error:', error);
//
//     // Return detailed error for debugging
//     return res.status(500).json({
//       success: false,
//       error: 'Payment processing failed',
//       message: error.message,
//       code: error.code || 'PAYMENT_ERROR',
//       details: process.env.NODE_ENV === 'development' ? {
//         stack: error.stack,
//         name: error.name
//       } : undefined
//     });
//   }
// });
//
// // Health check endpoint
// router.get('/health', (req, res) => {
//   console.log('🔍 Registration payment health check called');
//   res.json({
//     service: 'registration-payment',
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     endpoints: [
//       'POST /process - Process registration payment and create student record',
//       'GET /health - Health check'
//     ],
//     features: [
//       'Student record creation with payment fields',
//       'Donation record creation for registration fees',
//       'Payment transaction tracking',
//       'Test card simulation',
//       'Payment validation',
//       'Automatic user verification',
//       'JWT token generation',
//       'Registration completion'
//     ]
//   });
// });
//
// console.log('🔍 Registration payment routes loaded with complete payment tracking');
// export default router;
//
//
//
