// backend/src/routes/donations.ts - Final Clean Version
import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';
import { DonationService } from '../services/donationService';
import { StripeService } from '../services/payment/stripeService';
import { PayPalService } from '../services/payment/paypalService';
import { TaxReceiptService } from '../services/taxReceiptService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface Donation {
  id: string;
  amount: number | any; // Allow both number and Decimal types
  donorEmail: string;
  paymentMethod: string;
  studentId: string;
  donationType: string;
  isAnonymous: boolean;
  processedAt: Date;
  taxReceiptNumber?: string;
  student?: {
    firstName: string;
    lastName: string;
  };
  targetRegistry?: {
    itemName: string;
  };
}

interface DonationProcessResult {
  success: boolean;
  donation?: any;
  error?: string;
  taxReceipt?: {
    receiptNumber: string;
    receiptUrl: string | null;
    issued: boolean;
    message: string;
    error?: string;
  };
}

// Generate unique tax receipt number
const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GV${year}-${timestamp}-${random}`;
};

// Create donation (step 1)
router.post('/create',
  authenticateToken,
  [
    body('studentId').isUUID().withMessage('Valid student ID required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least $1'),
    body('donationType').isIn(['general', 'registry_item', 'emergency']).withMessage('Invalid donation type'),
    body('paymentMethod').isIn(['stripe', 'paypal', 'zelle']).withMessage('Invalid payment method'),
    body('isAnonymous').optional().isBoolean(),
    body('isRecurring').optional().isBoolean(),
    body('recurringFrequency').optional().isIn(['monthly', 'quarterly', 'annually'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      // Generate tax receipt number upfront
      const taxReceiptNumber = generateReceiptNumber();

      // Extract donor info from authenticated user
      const donorId = req.user?.id;
      const donorEmail = req.user?.email;
      const donorFirstName = req.user?.firstName;
      const donorLastName = req.user?.lastName;
      const donorPhone = req.user?.phone;
      const donorAddress = req.user?.address;

      // Add tax receipt number and donor info to donation data
      const donationData = {
        studentId: req.body.studentId,
        amount: req.body.amount,
        donationType: req.body.donationType,
        targetRegistryId: req.body.targetRegistryId,
        paymentMethod: req.body.paymentMethod,
        donorId,
        donorEmail,
        donorFirstName,
        donorLastName,
        donorPhone,
        donorAddress,
        isAnonymous: req.body.isAnonymous || false,
        donorMessage: req.body.donorMessage,
        allowPublicDisplay: req.body.allowPublicDisplay ?? true,
        allowStudentContact: req.body.allowStudentContact || false,
        isRecurring: req.body.isRecurring || false,
        recurringFrequency: req.body.recurringFrequency
      };

      const donation = await DonationService.createDonation(donationData);

      res.json({
        success: true,
        donation: donation.donation,
        message: 'Donation created successfully. Proceed to payment.'
      });

    } catch (error: any) {
      console.error('Create donation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create donation'
      });
    }
  }
);

// Process payment (step 2) - Enhanced with tax receipt generation
router.post('/process-payment',
  [
    body('donationId').isUUID().withMessage('Valid donation ID required'),
    body('paymentMethodId').optional().isString(),
    body('paypalOrderId').optional().isString(),
    body('testCardData').optional().isObject()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      console.log('🔍 Processing donation payment with tax receipt generation...');

      const result: DonationProcessResult = await DonationService.processPayment(req.body);

      if (result.success && result.donation) {
        console.log('✅ Payment successful, generating tax receipt...');

        try {
          // Get the completed donation with all details
          const donation = await prisma.donation.findUnique({
            where: { id: result.donation.id },
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  schoolName: true
                }
              },
              targetRegistry: {
                select: {
                  itemName: true
                }
              }
            }
          });

          if (!donation) {
            throw new Error('Donation not found after payment processing');
          }

          // Only generate tax receipt if donation is completed and has a receipt number
          if (donation.status === 'completed' && donation.taxReceiptNumber) {
            console.log('🔍 Generating tax receipt for donation:', donation.id);

            // Prepare receipt data
            const receiptData = {
              receiptNumber: donation.taxReceiptNumber,
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
              donorName: donation.isAnonymous
                ? 'Anonymous Donor'
                : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim(),
              donorAddress: donation.donorAddress || {
                street: 'Not provided',
                city: 'Not provided',
                state: 'Not provided',
                zipCode: 'Not provided'
              },
              donationAmount: Number(donation.amount),
              donationDate: donation.processedAt || donation.createdAt,
              donationDescription: `Donation to support ${donation.student?.firstName} ${donation.student?.lastName} at ${donation.student?.schoolName}${
                donation.targetRegistry ? ` - ${donation.targetRegistry.itemName}` : ''
              }`
            };

            console.log('🔍 Receipt data prepared:', {
              receiptNumber: receiptData.receiptNumber,
              donorName: receiptData.donorName,
              amount: receiptData.donationAmount,
              description: receiptData.donationDescription
            });

            // Generate and upload PDF receipt
            const taxReceiptUrl = await TaxReceiptService.generateAndUploadReceipt(receiptData);
            console.log('✅ Tax receipt PDF generated and uploaded:', taxReceiptUrl);

            // Check if a tax receipt already exists for this donation
            const existingTaxReceipt = await prisma.taxReceipt.findUnique({
              where: { donationId: donation.id }
            });
            let taxReceipt;
            if (existingTaxReceipt) {
              // Optionally update the existing record, or just use it
              taxReceipt = existingTaxReceipt;
              console.log('⚠️ Tax receipt already exists for this donation, skipping creation.');
            } else {
              taxReceipt = await prisma.taxReceipt.create({
                data: {
                  donationId: donation.id,
                  receiptNumber: donation.taxReceiptNumber,
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
                  generatedBy: null,
                  createdAt: new Date()
                }
              });
              console.log('✅ Tax receipt database record created:', taxReceipt.id);
            }

            // Update donation record to mark tax receipt as issued
            await prisma.donation.update({
              where: { id: donation.id },
              data: {
                taxReceiptIssued: true
              }
            });

            console.log('✅ Donation updated with tax receipt status');

            // Add tax receipt info to response
            result.taxReceipt = {
              receiptNumber: donation.taxReceiptNumber,
              receiptUrl: taxReceiptUrl,
              issued: true,
              message: 'Tax receipt generated successfully'
            };

          } else {
            console.log('⚠️ Donation not eligible for tax receipt:', {
              status: donation.status,
              hasReceiptNumber: !!donation.taxReceiptNumber
            });
          }

        } catch (taxReceiptError: any) {
          console.error('⚠️ Tax receipt generation failed:', taxReceiptError);
          console.error('Tax receipt error details:', taxReceiptError.message);

          // Add tax receipt error info to response but don't fail the payment
          result.taxReceipt = {
            receiptNumber: result.donation.taxReceiptNumber,
            receiptUrl: null,
            issued: false,
            message: 'Tax receipt generation failed - will be processed manually',
            error: taxReceiptError.message
          };
        }

        res.json({
          success: true,
          donation: result.donation,
          taxReceipt: result.taxReceipt,
          message: 'Payment processed successfully. Receipt sent to email.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          donation: result.donation
        });
      }

    } catch (error: any) {
      console.error('Process payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Payment processing failed'
      });
    }
  }
);

// Get donation history
router.get('/history',
  [
    query('studentId').optional().isUUID(),
    query('donorEmail').optional().isEmail(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  async (req: Request, res: Response) => {
    try {
      const { studentId, donorEmail, limit = 20, offset = 0 } = req.query;

      const donations = await prisma.donation.findMany({
        where: {
          ...(studentId && { studentId: studentId as string }),
          ...(donorEmail && { donorEmail: donorEmail as string }),
          status: 'completed'
        },
        include: {
          student: {
            select: { firstName: true, lastName: true }
          },
          targetRegistry: {
            select: { itemName: true }
          },
          taxReceipt: {
            select: {
              receiptNumber: true,
              receiptPdfUrl: true,
              issued: true,
              issuedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      type DonationResponse = {
        id: string;
        amount: number;
        donationType: string;
        studentName: string;
        targetItem?: string;
        donationDate: Date;
        taxReceiptNumber?: string;
        taxReceiptUrl?: string;
        taxReceiptIssued: boolean;
        isAnonymous: boolean;
      };

      res.json({
        success: true,
        donations: donations.map((donation: any): DonationResponse => ({
          id: donation.id,
          amount: typeof donation.amount === 'object' && 'toNumber' in donation.amount
            ? donation.amount.toNumber()
            : Number(donation.amount),
          donationType: donation.donationType,
          studentName: donation.isAnonymous ? 'Anonymous' :
            `${donation.student?.firstName ?? ''} ${donation.student?.lastName ?? ''}`.trim(),
          targetItem: donation.targetRegistry?.itemName,
          donationDate: donation.processedAt,
          taxReceiptNumber: donation.taxReceiptNumber,
          taxReceiptUrl: donation.taxReceipt?.receiptPdfUrl,
          taxReceiptIssued: donation.taxReceiptIssued || false,
          isAnonymous: donation.isAnonymous
        }))
      });

    } catch (error: any) {
      console.error('Get donation history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch donation history'
      });
    }
  }
);

// Get tax receipt for a donation
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
                email: true,
                schoolName: true
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
        nonprofitEin: taxReceipt.nonprofitEin,
        donation: {
          id: taxReceipt.donation.id,
          donationType: taxReceipt.donation.donationType,
          student: taxReceipt.donation.student
        }
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

// List all tax receipts for a donor
router.get('/tax-receipts', async (req, res) => {
  try {
    const { donorEmail } = req.query;
    let email = donorEmail as string;

    // If no email provided, try to get from auth token
    if (!email) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Email parameter or authentication required'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      email = decoded.email;
    }

    console.log('🔍 Fetching tax receipts for donor:', email);

    const taxReceipts = await prisma.taxReceipt.findMany({
      where: {
        donation: {
          donorEmail: email
        }
      },
      orderBy: {
        receiptDate: 'desc'
      },
      include: {
        donation: {
          select: {
            donationType: true,
            processedAt: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
                schoolName: true
              }
            }
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
        processedAt: receipt.donation.processedAt,
        student: receipt.donation.student
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

// Create payment intent for Stripe
router.post('/stripe/create-intent',
  [
    body('donationId').isUUID().withMessage('Valid donation ID required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { donationId } = req.body;

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: { student: true }
      });

      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found'
        });
      }

      if (donation.paymentMethod !== 'stripe') {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method for this donation'
        });
      }

      const paymentIntent = await StripeService.createPaymentIntent({
        amount: Math.round(Number(donation.amount) * 100),
        currency: 'usd',
        metadata: {
          donationId: donation.id,
          studentId: donation.studentId,
          donorEmail: donation.donorEmail,
          nonprofitId: 'gradvillage-501c3',
          taxReceiptNumber: donation.taxReceiptNumber || ''
        },
        stripeAccount: process.env.STRIPE_NONPROFIT_ACCOUNT_ID
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } catch (error: any) {
      console.error('Create Stripe intent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment intent'
      });
    }
  }
);

// Create PayPal order
router.post('/paypal/create-order',
  [
    body('donationId').isUUID().withMessage('Valid donation ID required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { donationId } = req.body;

      const donation = await prisma.donation.findUnique({
        where: { id: donationId }
      });

      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found'
        });
      }

      if (donation.paymentMethod !== 'paypal') {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method for this donation'
        });
      }

      const paypalService = new PayPalService();
      const orderId = await paypalService.createOrder(
        Number(donation.amount),
        'USD',
        `Donation for ${donation.donorEmail}`,
        {
          donationId: donation.id,
          donorEmail: donation.donorEmail,
          nonprofitAccount: process.env.PAYPAL_NONPROFIT_MERCHANT_ID,
          taxReceiptNumber: donation.taxReceiptNumber || ''
        }
      );

      res.json({
        success: true,
        orderId,
        approvalUrl: `https://www.paypal.com/checkoutnow?token=${orderId}`
      });

    } catch (error: any) {
      console.error('Create PayPal order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create PayPal order'
      });
    }
  }
);

// Stripe webhook handler
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    await StripeService.handleWebhook(payload, signature);

    res.json({ received: true });

  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook handling failed'
    });
  }
});

// PayPal webhook handler
router.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const paypalService = new PayPalService();
    // TODO: Implement webhook handling

    res.json({ received: true });

  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook handling failed'
    });
  }
});

// Regenerate tax receipt (admin function)
router.post('/regenerate-tax-receipt/:donationId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { donationId } = req.params;

      console.log('🔍 Regenerating tax receipt for donation:', donationId);

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              schoolName: true
            }
          },
          targetRegistry: {
            select: {
              itemName: true
            }
          },
          taxReceipt: true
        }
      });

      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found'
        });
      }

      if (donation.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Cannot generate tax receipt for incomplete donation'
        });
      }

      const receiptNumber = donation.taxReceiptNumber || generateReceiptNumber();

      const receiptData = {
        receiptNumber,
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
        donorName: donation.isAnonymous
          ? 'Anonymous Donor'
          : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim(),
        donorAddress: donation.donorAddress || {
          street: 'Not provided',
          city: 'Not provided',
          state: 'Not provided',
          zipCode: 'Not provided'
        },
        donationAmount: Number(donation.amount),
        donationDate: donation.processedAt || donation.createdAt,
        donationDescription: `Donation to support ${donation.student?.firstName} ${donation.student?.lastName} at ${donation.student?.schoolName}${
          donation.targetRegistry ? ` - ${donation.targetRegistry.itemName}` : ''
        }`
      };

      const taxReceiptUrl = await TaxReceiptService.generateAndUploadReceipt(receiptData);

      if (donation.taxReceipt) {
        await prisma.taxReceipt.update({
          where: { id: donation.taxReceipt.id },
          data: {
            receiptPdfUrl: taxReceiptUrl,
            issued: true,
            issuedAt: new Date()
          }
        });
      } else {
        await prisma.taxReceipt.create({
          data: {
            donationId: donation.id,
            receiptNumber,
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
            generatedBy: null,
            createdAt: new Date()
          }
        });
      }

      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          taxReceiptNumber: receiptNumber,
          taxReceiptIssued: true
        }
      });

      console.log('✅ Tax receipt regenerated successfully');

      res.json({
        success: true,
        message: 'Tax receipt regenerated successfully',
        taxReceipt: {
          receiptNumber,
          receiptUrl: taxReceiptUrl,
          issued: true,
          regenerated: true
        }
      });

    } catch (error: any) {
      console.error('❌ Regenerate tax receipt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate tax receipt',
        message: error.message
      });
    }
  }
);

// Public donation creation (no authentication required)
router.post('/public/create',
  [
    body('studentId').isUUID().withMessage('Valid student ID required'),
    body('amount').isFloat({ min: 5, max: 10000 }).withMessage('Amount must be between $5 and $10,000'),
    body('donorEmail').isEmail().withMessage('Valid email required'),
    body('donorFirstName').notEmpty().withMessage('First name required'),
    body('donorLastName').notEmpty().withMessage('Last name required'),
    body('donorMessage').optional().isLength({ max: 500 }).withMessage('Message too long'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        studentId,
        amount,
        donorEmail,
        donorFirstName,
        donorLastName,
        donorMessage,
        isAnonymous = false,
        allowPublicDisplay = true
      } = req.body;

      // Verify student exists and is public
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          isActive: true,
          publicProfile: true
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found or profile not public'
        });
      }

      // Create donation record
      const donation = await prisma.donation.create({
        data: {
          studentId,
          amount: amount.toString(),
          donationType: 'general',
          paymentMethod: 'stripe',
          status: 'pending',
          donorEmail: isAnonymous ? 'anonymous@gradvillage.org' : donorEmail,
          donorFirstName: isAnonymous ? 'Anonymous' : donorFirstName,
          donorLastName: isAnonymous ? 'Donor' : donorLastName,
          donorMessage: donorMessage || null,
          isAnonymous,
          allowPublicDisplay,
          transactionFee: '0.00',
          netAmount: amount.toString()
        }
      });

      // Generate tax receipt number
      const taxReceiptNumber = `GRV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Update donation with tax receipt number
      const updatedDonation = await prisma.donation.update({
        where: { id: donation.id },
        data: { taxReceiptNumber }
      });

      console.log('✅ Public donation created:', {
        id: updatedDonation.id,
        studentId,
        amount,
        donorEmail: isAnonymous ? 'anonymous' : donorEmail,
        isAnonymous
      });

      res.json({
        success: true,
        message: 'Donation created successfully',
        donation: {
          id: updatedDonation.id,
          amount: Number(updatedDonation.amount),
          taxReceiptNumber: updatedDonation.taxReceiptNumber,
          status: updatedDonation.status,
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            school: student.schoolName
          }
        }
      });

    } catch (error: any) {
      console.error('Error creating public donation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create donation'
      });
    }
  }
);

export default router;