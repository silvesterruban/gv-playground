// backend/src/routes/admin.ts
import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import adminVerificationRouter from './admin-verification';

const router = express.Router();
const prisma = new PrismaClient();

// router.use('/verification', adminVerificationRouter);

// Admin authentication middleware
// const authenticateAdmin = async (req: any, res: Response, next: any) => {
//   try {
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     // Then check if user is admin
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     // Check if user has admin role (assuming userType is stored in req.user)
//     if (req.user.userType !== 'admin') {
//       return res.status(403).json({ error: 'Admin access required' });
//     }
//
//     next();
//   } catch (error) {
//     console.error('Admin auth error:', error);
//     return res.status(401).json({ error: 'Invalid admin authentication' });
//   }
// };

// Update this function in your backend/src/routes/admin.ts

// backend/src/routes/admin.ts - Update the authenticateAdmin function

const authenticateAdmin = async (req: any, res: Response, next: any) => {
  try {
    // First check if user is authenticated
    await requireAuth(req, res, () => {});

    // Then check if user is admin
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔐 [Admin Auth] User data:', req.user);
    console.log('🔐 [Admin Auth] User role:', req.user.role);
    console.log('🔐 [Admin Auth] User userType:', req.user.userType);

    // Check if user has admin role - UPDATED TO ACCEPT BOTH
    const isAdmin = req.user.role === 'super_admin' ||
                   req.user.role === 'admin' ||
                   req.user.userType === 'admin';

    if (!isAdmin) {
      console.log('❌ [Admin Auth] Access denied - not admin');
      console.log('❌ [Admin Auth] User role:', req.user.role);
      console.log('❌ [Admin Auth] User userType:', req.user.userType);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('✅ [Admin Auth] Admin access granted');
    next();
  } catch (error) {
    console.error('💥 [Admin Auth] Error:', error);
    // Don't send response if headers already sent
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Invalid admin authentication' });
    }
  }
};


// GET /api/admin/stats - Get platform statistics
router.get('/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[Admin API] Fetching platform statistics...');

    // Count students, donors, and admins using your actual models
    const [studentCount, donorCount, adminCount] = await Promise.all([
      prisma.student.count(),
      prisma.donor.count(),
      prisma.admin.count(),
    ]);

    // Count verified students
    const verifiedStudents = await prisma.student.count({
      where: { verified: true }
    });

    // Count active students (based on your schema fields)
    const activeStudents = await prisma.student.count({
      where: {
        isActive: true,
        publicProfile: true
      }
    });

    // Count pending school verifications
    const pendingVerifications = await prisma.schoolVerification.count({
      where: { status: 'pending' }
    });

    // Count total donations and calculate revenue
    const [donationCount, donationStats] = await Promise.all([
      prisma.donation.count(),
      prisma.donation.aggregate({
        _sum: {
          amount: true,
          netAmount: true,
        },
        where: {
          status: 'completed' // Only count completed donations
        }
      })
    ]);

    // Calculate total amount raised by all students
    const studentFundingStats = await prisma.student.aggregate({
      _sum: {
        amountRaised: true,
        fundingGoal: true,
      }
    });

    const stats = {
      totalStudents: studentCount,
      totalDonors: donorCount,
      totalAdmins: adminCount,
      totalUsers: studentCount + donorCount + adminCount,
      verifiedStudents: verifiedStudents,
      activeStudents: activeStudents,
      pendingVerifications: pendingVerifications,
      totalDonations: donationCount,
      totalRevenue: donationStats._sum.amount || 0,
      totalNetRevenue: donationStats._sum.netAmount || 0,
      totalAmountRaised: studentFundingStats._sum.amountRaised || 0,
      totalFundingGoals: studentFundingStats._sum.fundingGoal || 0,
    };

    console.log('[Admin API] Stats calculated:', stats);

    res.json(stats);
  } catch (error) {
    console.error('[Admin API] Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch platform statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/users - Get all users (students, donors, admins)
router.get('/users', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userType = req.query.userType as string;
    const skip = (page - 1) * limit;

    let users: any[] = [];
    let totalUsers = 0;

    if (!userType || userType === 'all') {
      // Get all user types
      const [students, donors, admins] = await Promise.all([
        prisma.student.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verified: true,
            isActive: true,
            createdAt: true,
            schoolName: true,
            registrationStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: userType === 'student' ? skip : 0,
          take: userType === 'student' ? limit : undefined,
        }),
        prisma.donor.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verified: true,
            isActive: true,
            createdAt: true,
            totalDonated: true,
            studentsSupported: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: userType === 'donor' ? skip : 0,
          take: userType === 'donor' ? limit : undefined,
        }),
        prisma.admin.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLogin: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: userType === 'admin' ? skip : 0,
          take: userType === 'admin' ? limit : undefined,
        }),
      ]);

      // Add userType field to each user
      const allUsers = [
        ...students.map(s => ({ ...s, userType: 'student' })),
        ...donors.map(d => ({ ...d, userType: 'donor' })),
        ...admins.map(a => ({ ...a, userType: 'admin' })),
      ];

      users = allUsers.slice(skip, skip + limit);
      totalUsers = allUsers.length;

    } else if (userType === 'student') {
      [users, totalUsers] = await Promise.all([
        prisma.student.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verified: true,
            isActive: true,
            createdAt: true,
            schoolName: true,
            registrationStatus: true,
            amountRaised: true,
            fundingGoal: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }).then(students => students.map(s => ({ ...s, userType: 'student' }))),
        prisma.student.count(),
      ]);

    } else if (userType === 'donor') {
      [users, totalUsers] = await Promise.all([
        prisma.donor.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verified: true,
            isActive: true,
            createdAt: true,
            totalDonated: true,
            studentsSupported: true,
            memberSince: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }).then(donors => donors.map(d => ({ ...d, userType: 'donor' }))),
        prisma.donor.count(),
      ]);

    } else if (userType === 'admin') {
      [users, totalUsers] = await Promise.all([
        prisma.admin.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLogin: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }).then(admins => admins.map(a => ({ ...a, userType: 'admin' }))),
        prisma.admin.count(),
      ]);
    }

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/admin/users/:userId/status - Update user status
router.put('/users/:userId/status', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, reason, userType } = req.body;

    // Validate inputs
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!['student', 'donor', 'admin'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    let updatedUser;

    // Update the appropriate table based on user type
    if (userType === 'student') {
      updatedUser = await prisma.student.update({
        where: { id: userId },
        data: {
          isActive: status === 'active',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          verified: true,
        }
      });
    } else if (userType === 'donor') {
      updatedUser = await prisma.donor.update({
        where: { id: userId },
        data: {
          isActive: status === 'active',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          verified: true,
        }
      });
    } else if (userType === 'admin') {
      updatedUser = await prisma.admin.update({
        where: { id: userId },
        data: {
          isActive: status === 'active',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          role: true,
        }
      });
    }

    console.log(`[Admin API] User ${userId} status updated to ${status}`);

    res.json({
      message: 'User status updated successfully',
      user: { ...updatedUser, userType }
    });
  } catch (error) {
    console.error('[Admin API] Error updating user status:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/verifications - Get pending school verifications
router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const pendingVerifications = await prisma.schoolVerification.findMany({
      where: {
        status: 'pending'
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            schoolName: true,
          }
        },
        school: {
          select: {
            id: true,
            name: true,
            domain: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      verifications: pendingVerifications,
      count: pendingVerifications.length
    });
  } catch (error) {
    console.error('[Admin API] Error fetching verifications:', error);
    res.status(500).json({
      error: 'Failed to fetch verifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/verifications/:verificationId/approve - Approve verification
router.post('/verifications/:verificationId/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    const { notes } = req.body;

    // Update verification status to approved
    const updatedVerification = await prisma.schoolVerification.update({
      where: { id: verificationId },
      data: {
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: req.user?.id,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // Also update the student's verification status
    await prisma.student.update({
      where: { id: updatedVerification.studentId },
      data: {
        verified: true,
        schoolVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user?.id,
      }
    });

    console.log(`[Admin API] Verification ${verificationId} approved`);

    res.json({
      message: 'Verification approved successfully',
      verification: updatedVerification
    });
  } catch (error) {
    console.error('[Admin API] Error approving verification:', error);
    res.status(500).json({
      error: 'Failed to approve verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/verifications/:verificationId/reject - Reject verification
router.post('/verifications/:verificationId/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    const { reason } = req.body;

    // Update verification status to rejected
    const updatedVerification = await prisma.schoolVerification.update({
      where: { id: verificationId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        verifiedBy: req.user?.id,
        updatedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // Update the student's rejection status
    await prisma.student.update({
      where: { id: updatedVerification.studentId },
      data: {
        rejectedAt: new Date(),
        rejectedBy: req.user?.id,
        rejectionReason: reason,
      }
    });

    console.log(`[Admin API] Verification ${verificationId} rejected`);

    res.json({
      message: 'Verification rejected successfully',
      verification: updatedVerification
    });
  } catch (error) {
    console.error('[Admin API] Error rejecting verification:', error);
    res.status(500).json({
      error: 'Failed to reject verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/donations - Get donation analytics
router.get('/donations', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [donations, totalDonations] = await Promise.all([
      prisma.donation.findMany({
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          donationType: true,
          isAnonymous: true,
          createdAt: true,
          processedAt: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          donor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.donation.count(),
    ]);

    res.json({
      donations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalDonations / limit),
        totalDonations,
        hasNextPage: page * limit < totalDonations,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error('[Admin API] Error fetching donations:', error);
    res.status(500).json({
      error: 'Failed to fetch donations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Stripe configuration endpoint
router.get('/test-stripe', async (req, res) => {
  try {
    const { StripeService } = await import('../services/payment/stripeService');
    
    // Get environment info
    const envInfo = StripeService.getEnvironmentInfo();
    
    // Get current instance info (avoid circular references)
    const instanceInfo = StripeService.getCurrentInstance();
    
    // Test a simple Stripe API call
    let apiTestResult = null;
    try {
      const testIntent = await StripeService.createPaymentIntent({
        amount: 100, // $1.00
        currency: 'usd',
        metadata: {
          test: 'true',
          endpoint: 'admin-test-stripe'
        }
      });
      apiTestResult = {
        success: true,
        paymentIntentId: testIntent.id,
        status: testIntent.status
      };
    } catch (apiError) {
      apiTestResult = {
        success: false,
        error: apiError.message,
        errorType: apiError.constructor.name
      };
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envInfo,
      instance: {
        instanceId: instanceInfo.instanceId,
        hasPaymentIntents: instanceInfo.hasPaymentIntents,
        hasCustomers: instanceInfo.hasCustomers,
        hasWebhooks: instanceInfo.hasWebhooks
      },
      apiTest: apiTestResult
    });
  } catch (error) {
    console.error('Stripe test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check schools table (no auth required for testing)
router.get('/debug/schools', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        verificationMethods: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });

    const schoolCount = schools.length;

    res.json({
      success: true,
      message: `Found ${schoolCount} schools in database`,
      schoolCount,
      schools,
      timestamp: new Date().toISOString()
    });

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Error fetching schools for debug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clean up Prisma connection on exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default router;