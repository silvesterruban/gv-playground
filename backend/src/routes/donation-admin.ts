// backend/src/routes/donation-admin.ts
import { Router, Request, Response } from 'express';
import { query, body, param, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all donations with filtering and pagination
router.get('/donations',
  [
    query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
    query('paymentMethod').optional().isIn(['stripe', 'paypal', 'zelle']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('minAmount').optional().isFloat({ min: 0 }),
    query('maxAmount').optional().isFloat({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('search').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const {
        status,
        paymentMethod,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        limit = 50,
        offset = 0,
        search
      } = req.query;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount.gte = parseFloat(minAmount as string);
        if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
      }
      if (search) {
        where.OR = [
          { donorEmail: { contains: search as string, mode: 'insensitive' } },
          { donorFirstName: { contains: search as string, mode: 'insensitive' } },
          { donorLastName: { contains: search as string, mode: 'insensitive' } },
          { taxReceiptNumber: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [donations, total] = await Promise.all([
        prisma.donation.findMany({
          where,
          include: {
            student: {
              select: { firstName: true, lastName: true, email: true, schoolName: true }
            },
            targetRegistry: {
              select: { itemName: true, price: true }
            },
            paymentTransaction: {
              select: {
                provider: true,
                providerTransactionId: true,
                providerFee: true,
                settlementBatchId: true
              }
            },
            taxReceipt: {
              select: {
                receiptNumber: true,
                issued: true,
                issuedAt: true,
                receiptPdfUrl: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.donation.count({ where })
      ]);

      res.json({
        success: true,
        donations,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error: any) {
      console.error('Admin get donations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch donations'
      });
    }
  }
);

// Get donation analytics
router.get('/analytics',
  [
    query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req: Request, res: Response) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;

      // Calculate date range
      let dateFilter: any = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        };
      } else {
        const now = new Date();
        const periodMap = {
          day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        };
        dateFilter = {
          createdAt: {
            gte: periodMap[period as keyof typeof periodMap]
          }
        };
      }

      // Get basic statistics
      const [
        totalDonations,
        completedDonations,
        totalAmount,
        avgDonation,
        donationsByMethod,
        donationsByType,
        recentDonations,
        topStudents,
        dailyTrend,
        topDonors
      ] = await Promise.all([
        // Total donations count
        prisma.donation.count({
          where: { ...dateFilter, status: { not: 'failed' } }
        }),

        // Completed donations count
        prisma.donation.count({
          where: { ...dateFilter, status: 'completed' }
        }),

        // Total amount raised
        prisma.donation.aggregate({
          where: { ...dateFilter, status: 'completed' },
          _sum: { amount: true }
        }),

        // Average donation amount
        prisma.donation.aggregate({
          where: { ...dateFilter, status: 'completed' },
          _avg: { amount: true }
        }),

        // Donations by payment method
        prisma.donation.groupBy({
          by: ['paymentMethod'],
          where: { ...dateFilter, status: 'completed' },
          _count: true,
          _sum: { amount: true }
        }),

        // Donations by type
        prisma.donation.groupBy({
          by: ['donationType'],
          where: { ...dateFilter, status: 'completed' },
          _count: true,
          _sum: { amount: true }
        }),

        // Recent donations
        prisma.donation.findMany({
          where: { ...dateFilter, status: 'completed' },
          include: {
            student: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),

        // Top students by donations received
        prisma.donation.groupBy({
          by: ['studentId'],
          where: { ...dateFilter, status: 'completed' },
          _count: true,
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        }),

        // Daily trend data - get all donations and group by date in JavaScript
        prisma.donation.findMany({
          where: { ...dateFilter, status: 'completed' },
          select: {
            amount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Top donors
        prisma.donation.groupBy({
          by: ['donorEmail'],
          where: { ...dateFilter, status: 'completed' },
          _count: true,
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]);

      // Get student details for top students
      const topStudentIds = topStudents.map(s => s.studentId);
      const studentDetails = await prisma.student.findMany({
        where: { id: { in: topStudentIds } },
        select: { id: true, firstName: true, lastName: true, schoolName: true }
      });

      const topStudentsWithDetails = topStudents.map(student => {
        const details = studentDetails.find(d => d.id === student.studentId);
        return {
          ...student,
          studentName: details ? `${details.firstName} ${details.lastName}` : 'Unknown',
          school: details?.schoolName || 'Unknown'
        };
      });

      // Process daily trend data
      const dailyTrendMap = new Map();
      dailyTrend.forEach(donation => {
        const date = donation.createdAt.toISOString().split('T')[0]; // Get YYYY-MM-DD
        const amount = Number(donation.amount) || 0; // Convert to number safely
        if (dailyTrendMap.has(date)) {
          const existing = dailyTrendMap.get(date);
          existing.count += 1;
          existing.total += amount;
        } else {
          dailyTrendMap.set(date, {
            date: date,
            count: 1,
            total: amount
          });
        }
      });

      const dailyTrendArray = Array.from(dailyTrendMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30); // Limit to 30 days

      res.json({
        success: true,
        analytics: {
          summary: {
            totalDonations,
            completedDonations,
            totalAmount: totalAmount._sum.amount || 0,
            avgDonation: avgDonation._avg.amount || 0,
            successRate: totalDonations > 0 ? (completedDonations / totalDonations) * 100 : 0
          },
          breakdowns: {
            byPaymentMethod: donationsByMethod,
            byDonationType: donationsByType
          },
          insights: {
            recentDonations: recentDonations.map(d => ({
              id: d.id,
              amount: d.amount,
              studentName: d.isAnonymous ? 'Anonymous' :
                `${d.student.firstName} ${d.student.lastName}`,
              donationType: d.donationType,
              createdAt: d.createdAt
            })),
            topStudents: topStudentsWithDetails,
            dailyTrend: dailyTrendArray,
            topDonors: topDonors.map(donor => ({
              id: donor.donorEmail,
              name: donor.donorEmail,
              totalAmount: donor._sum?.amount || 0,
              donationCount: donor._count
            }))
          }
        }
      });

    } catch (error: any) {
      console.error('Admin analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate analytics'
      });
    }
  }
);

// Process refund
router.post('/refund/:donationId',
  [
    param('donationId').isUUID().withMessage('Valid donation ID required'),
    body('reason').isString().isLength({ min: 1 }).withMessage('Refund reason required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
    body('notifyDonor').optional().isBoolean()
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

      const { donationId } = req.params;
      const { reason, amount, notifyDonor = true } = req.body;
      const adminId = req.user?.userId;

      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          paymentTransaction: true,
          student: true
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
          error: 'Can only refund completed donations'
        });
      }

      const refundAmount = amount || Number(donation.amount);

      if (refundAmount > Number(donation.amount)) {
        return res.status(400).json({
          success: false,
          error: 'Refund amount cannot exceed donation amount'
        });
      }

      // Update donation record
      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: 'refunded',
          refundReason: reason,
          refundedAt: new Date()
        }
      });

      // Update student funding amounts
      await prisma.student.update({
        where: { id: donation.studentId },
        data: {
          amountRaised: {
            decrement: refundAmount
          }
        }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminId: adminId!,
          action: 'REFUND_DONATION',
          targetType: 'DONATION',
          targetId: donationId,
          details: {
            originalAmount: donation.amount,
            refundAmount,
            reason
          },
          ipAddress: req.ip || 'unknown'
        }
      });

      res.json({
        success: true,
        donation: updatedDonation,
        message: 'Refund processed successfully'
      });

    } catch (error: any) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }
  }
);

// Manually verify Zelle payment
router.post('/verify-zelle/:donationId',
  [
    param('donationId').isUUID().withMessage('Valid donation ID required'),
    body('verified').isBoolean().withMessage('Verification status required'),
    body('notes').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const { donationId } = req.params;
      const { verified, notes } = req.body;
      const adminId = req.user?.userId;

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

      if (donation.paymentMethod !== 'zelle') {
        return res.status(400).json({
          success: false,
          error: 'This endpoint is only for Zelle payments'
        });
      }

      if (donation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Donation is not pending verification'
        });
      }

      // Update donation status
      const updatedDonation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: verified ? 'completed' : 'failed',
          processedAt: verified ? new Date() : null,
          failureReason: verified ? null : 'Manual verification failed'
        }
      });

      if (verified) {
        // Create payment transaction record
        await prisma.paymentTransaction.create({
          data: {
            donationId: donation.id,
            provider: 'zelle',
            providerTransactionId: `zelle-manual-${Date.now()}`,
            providerFee: 0,
            grossAmount: donation.amount,
            netAmount: donation.amount,
            merchantAccountId: 'zelle-manual',
            gatewayResponse: { manuallyVerified: true, notes }
          }
        });
      }

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminId: adminId!,
          action: verified ? 'VERIFY_ZELLE_PAYMENT' : 'REJECT_ZELLE_PAYMENT',
          targetType: 'DONATION',
          targetId: donationId,
          details: { verified, notes },
          ipAddress: req.ip || 'unknown'
        }
      });

      res.json({
        success: true,
        donation: updatedDonation,
        message: verified ? 'Payment verified successfully' : 'Payment verification rejected'
      });

    } catch (error: any) {
      console.error('Verify Zelle payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify payment'
      });
    }
  }
);

// Export donation data
router.get('/export',
  [
    query('format').isIn(['csv']).withMessage('Format must be csv'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded'])
  ],
  async (req: Request, res: Response) => {
    try {
      const { format, startDate, endDate, status } = req.query;

      // Build where clause
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }
      if (status) where.status = status;

      const donations = await prisma.donation.findMany({
        where,
        include: {
          student: {
            select: { firstName: true, lastName: true, email: true, schoolName: true }
          },
          targetRegistry: {
            select: { itemName: true }
          },
          paymentTransaction: {
            select: { providerTransactionId: true, providerFee: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format data for export
      const exportData = donations.map(donation => ({
        'Donation ID': donation.id,
        'Receipt Number': donation.taxReceiptNumber,
        'Date': donation.createdAt.toISOString(),
        'Student Name': `${donation.student.firstName} ${donation.student.lastName}`,
        'Student Email': donation.student.email,
        'School': donation.student.schoolName,
        'Donor Name': donation.isAnonymous ? 'Anonymous' :
          `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim(),
        'Donor Email': donation.donorEmail,
        'Amount': donation.amount,
        'Net Amount': donation.netAmount,
        'Payment Method': donation.paymentMethod,
        'Transaction ID': donation.paymentTransaction?.providerTransactionId || '',
        'Donation Type': donation.donationType,
        'Target Item': donation.targetRegistry?.itemName || '',
        'Status': donation.status,
        'Is Recurring': donation.isRecurring,
        'Is Anonymous': donation.isAnonymous,
        'Processed Date': donation.processedAt?.toISOString() || ''
      }));

      if (format === 'csv') {
        const csv = generateCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=donations-${Date.now()}.csv`);
        res.send(csv);
      }

    } catch (error: any) {
      console.error('Export donations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export donations'
      });
    }
  }
);

// Helper function to generate CSV
function generateCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

export default router;