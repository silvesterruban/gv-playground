// backend/src/routes/admin-verification.ts
import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Admin authentication middleware
const authenticateAdmin = async (req: any, res: Response, next: any) => {
  try {
    // First check if user is authenticated
    await authenticateToken(req, res, () => {});

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is an admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid admin authentication' });
  }
};

// GET /api/admin/verifications - Get all pending verifications
router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [AdminVerification] /verifications endpoint hit - NEW CODE VERSION');
    console.log('🔍 [AdminVerification] Query params:', req.query);

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const whereClause: any = {};
    // TEMPORARILY DISABLED - Get all verifications regardless of status
    // if (status && status !== 'all') {
    //   whereClause.status = status;
    // }

    console.log('[AdminVerification] Where clause:', whereClause);
    console.log('[AdminVerification] Status filter:', status);

    // Get verifications without includes first
    const verifications = await prisma.schoolVerification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip: skip,
      take: Number(limit)
    });

    console.log(`[AdminVerification] Raw verifications from DB:`, verifications.length);

    // Get total count for pagination
    const totalCount = await prisma.schoolVerification.count({
      where: whereClause
    });

    console.log(`[AdminVerification] Total count:`, totalCount);

    // Manually fetch related data for each verification
    const transformedVerifications = [];

    for (const verification of verifications) {
      try {
        console.log(`[AdminVerification] Processing verification:`, verification.id);

        // Fetch student data separately
        let studentData = { id: 'unknown', firstName: 'Unknown', lastName: 'User', email: 'No email' };
        try {
          const student = await prisma.student.findUnique({
            where: { id: verification.studentId },
            select: { id: true, firstName: true, lastName: true, email: true }
          });
          if (student) {
            studentData = student;
            console.log(`[AdminVerification] Student found:`, student.firstName, student.lastName);
          } else {
            console.log(`[AdminVerification] Student not found for ID:`, verification.studentId);
          }
        } catch (error) {
          console.error(`[AdminVerification] Error fetching student ${verification.studentId}:`, error);
        }

        // Fetch school data separately
        let schoolData = { id: 'unknown', name: 'Unknown School', domain: null as string | null };
        try {
          const school = await prisma.school.findUnique({
            where: { id: verification.schoolId },
            select: { id: true, name: true, domain: true }
          });
          if (school) {
            schoolData = school;
            console.log(`[AdminVerification] School found:`, school.name);
          } else {
            console.log(`[AdminVerification] School not found for ID:`, verification.schoolId);
          }
        } catch (error) {
          console.error(`[AdminVerification] Error fetching school ${verification.schoolId}:`, error);
        }

        const transformedVerification = {
          id: verification.id,
          status: verification.status,
          verificationMethod: verification.verificationMethod,
          verificationEmail: verification.verificationEmail,
          verificationDocument: verification.verificationDocument,
          rejectionReason: verification.rejectionReason,
          createdAt: verification.createdAt.toISOString(),
          verifiedAt: verification.verifiedAt?.toISOString(),
          updatedAt: verification.updatedAt.toISOString(),
          student: studentData,
          school: schoolData
        };

        transformedVerifications.push(transformedVerification);
        console.log(`[AdminVerification] Successfully processed verification:`, verification.id);

      } catch (error) {
        console.error(`[AdminVerification] Error processing verification ${verification.id}:`, error);
        // Continue processing other verifications even if one fails
      }
    }

    console.log(`[AdminVerification] Final transformed verifications count:`, transformedVerifications.length);

    // TEMPORARY: Send simple response to test
    if (transformedVerifications.length === 0) {
      console.log('⚠️ [AdminVerification] No verifications processed - sending debug info');
      return res.json({
        success: true,
        debug: "NEW CODE RUNNING BUT NO VERIFICATIONS PROCESSED",
        rawVerificationsCount: verifications.length,
        verifications: [],
        totalCount,
        whereClause
      });
    }

    res.json({
      success: true,
      verifications: transformedVerifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
        hasNext: skip + Number(limit) < totalCount,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('[AdminVerification] Error fetching verifications:', error);
    res.status(500).json({
      error: 'Failed to fetch verifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/verifications/:id/approve - Approve a verification
router.post('/verifications/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    console.log(`[AdminVerification] Admin ${req.user?.id} approving verification ${id}`);

    // Find the verification
    const verification = await prisma.schoolVerification.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ error: 'Can only approve pending verifications' });
    }

    // Start transaction to update both verification and student records
    const result = await prisma.$transaction(async (tx) => {
      // Update verification status
      const updatedVerification = await tx.schoolVerification.update({
        where: { id },
        data: {
          status: 'approved',
          verifiedAt: new Date(),
          rejectionReason: null,
          updatedAt: new Date()
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          school: {
            select: {
              name: true,
              domain: true
            }
          }
        }
      });

      // Update student verified status
      await tx.student.update({
        where: { id: verification.student.id },
        data: { verified: true }
      });

      return updatedVerification;
    });

    console.log(`[AdminVerification] Verification ${id} approved successfully`);

    res.json({
      success: true,
      message: 'Verification approved successfully',
      verification: {
        id: result.id,
        status: result.status,
        verifiedAt: result.verifiedAt?.toISOString(),
        student: result.student,
        school: result.school
      }
    });
  } catch (error) {
    console.error('[AdminVerification] Error approving verification:', error);
    res.status(500).json({
      error: 'Failed to approve verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/verifications/:id/reject - Reject a verification
router.post('/verifications/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    console.log(`[AdminVerification] Admin ${req.user?.id} rejecting verification ${id}`);

    // Find the verification
    const verification = await prisma.schoolVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending verifications' });
    }

    // Update verification status
    const updatedVerification = await prisma.schoolVerification.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        verifiedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        school: {
          select: {
            name: true,
            domain: true
          }
        }
      }
    });

    console.log(`[AdminVerification] Verification ${id} rejected successfully`);

    res.json({
      success: true,
      message: 'Verification rejected successfully',
      verification: {
        id: updatedVerification.id,
        status: updatedVerification.status,
        rejectionReason: updatedVerification.rejectionReason,
        verifiedAt: updatedVerification.verifiedAt?.toISOString(),
        student: updatedVerification.student,
        school: updatedVerification.school
      }
    });
  } catch (error) {
    console.error('[AdminVerification] Error rejecting verification:', error);
    res.status(500).json({
      error: 'Failed to reject verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/verifications/stats - Get verification statistics
router.get('/verifications/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminVerification] Fetching verification statistics...');

    const stats = await prisma.schoolVerification.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    const totalVerifications = await prisma.schoolVerification.count();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayVerifications = await prisma.schoolVerification.count({
      where: {
        createdAt: {
          gte: todayStart
        }
      }
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      total: totalVerifications,
      today: todayVerifications,
      pending: statsMap.pending || 0,
      approved: statsMap.approved || 0,
      rejected: statsMap.rejected || 0
    };

    console.log('[AdminVerification] Stats:', response);

    res.json({
      success: true,
      stats: response
    });
  } catch (error) {
    console.error('[AdminVerification] Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch verification statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/admin/verifications/:id - Delete a verification (admin only)
router.delete('/verifications/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[AdminVerification] Admin ${req.user?.id} deleting verification ${id}`);

    // Find the verification
    const verification = await prisma.schoolVerification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Delete the verification
    await prisma.schoolVerification.delete({
      where: { id }
    });

    console.log(`[AdminVerification] Verification ${id} deleted successfully`);

    res.json({
      success: true,
      message: 'Verification deleted successfully'
    });
  } catch (error) {
    console.error('[AdminVerification] Error deleting verification:', error);
    res.status(500).json({
      error: 'Failed to delete verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add this to your admin routes to test if new code is deployed
router.get('/debug/test-new-code', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminVerification] NEW CODE TEST - This should appear in logs');

    // Simple query without any complexity
    const count = await prisma.schoolVerification.count();
    const verifications = await prisma.schoolVerification.findMany({ take: 1 });

    console.log('[AdminVerification] NEW CODE TEST - Found', count, 'total verifications');

    res.json({
      success: true,
      message: "NEW CODE IS RUNNING",
      totalCount: count,
      sampleVerification: verifications[0] || null
    });
  } catch (error) {
    console.error('[AdminVerification] NEW CODE TEST - Error:', error);
        res.status(500).json({
          error: 'Failed to NEW CODE TEST',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
  }
});


export default router;



// // backend/src/routes/admin-verification.ts
// import express from 'express';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticateToken } from '../middleware/auth';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Admin authentication middleware
// const authenticateAdmin = async (req: any, res: Response, next: any) => {
//   try {
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     // Check if user is an admin
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
//
// // GET /api/admin/verifications - Get all pending verifications
// router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching all verifications...');
//
//     const { status, page = 1, limit = 20 } = req.query;
//     const skip = (Number(page) - 1) * Number(limit);
//
//     // Build where clause
//     const whereClause: any = {};
//     // TEMPORARILY DISABLED - Get all verifications regardless of status
//     // if (status && status !== 'all') {
//     //   whereClause.status = status;
//     // }
//
//     console.log('[AdminVerification] Where clause:', whereClause);
//     console.log('[AdminVerification] Status filter:', status);
//
//     // Get verifications without includes first
//     const verifications = await prisma.schoolVerification.findMany({
//       where: whereClause,
//       orderBy: {
//         createdAt: 'desc'
//       },
//       skip: skip,
//       take: Number(limit)
//     });
//
//     console.log(`[AdminVerification] Raw verifications from DB:`, verifications.length);
//
//     // Get total count for pagination
//     const totalCount = await prisma.schoolVerification.count({
//       where: whereClause
//     });
//
//     console.log(`[AdminVerification] Total count:`, totalCount);
//
//     // Manually fetch related data for each verification
//     const transformedVerifications = [];
//
//     for (const verification of verifications) {
//       try {
//         console.log(`[AdminVerification] Processing verification:`, verification.id);
//
//         // Fetch student data separately
//         let studentData = { id: 'unknown', firstName: 'Unknown', lastName: 'User', email: 'No email' };
//         try {
//           const student = await prisma.student.findUnique({
//             where: { id: verification.studentId },
//             select: { id: true, firstName: true, lastName: true, email: true }
//           });
//           if (student) {
//             studentData = student;
//             console.log(`[AdminVerification] Student found:`, student.firstName, student.lastName);
//           } else {
//             console.log(`[AdminVerification] Student not found for ID:`, verification.studentId);
//           }
//         } catch (error) {
//           console.error(`[AdminVerification] Error fetching student ${verification.studentId}:`, error);
//         }
//
//         // Fetch school data separately
//         let schoolData = { id: 'unknown', name: 'Unknown School', domain: null as string | null };
//         try {
//           const school = await prisma.school.findUnique({
//             where: { id: verification.schoolId },
//             select: { id: true, name: true, domain: true }
//           });
//           if (school) {
//             schoolData = school;
//             console.log(`[AdminVerification] School found:`, school.name);
//           } else {
//             console.log(`[AdminVerification] School not found for ID:`, verification.schoolId);
//           }
//         } catch (error) {
//           console.error(`[AdminVerification] Error fetching school ${verification.schoolId}:`, error);
//         }
//
//         const transformedVerification = {
//           id: verification.id,
//           status: verification.status,
//           verificationMethod: verification.verificationMethod,
//           verificationEmail: verification.verificationEmail,
//           verificationDocument: verification.verificationDocument,
//           rejectionReason: verification.rejectionReason,
//           createdAt: verification.createdAt.toISOString(),
//           verifiedAt: verification.verifiedAt?.toISOString(),
//           updatedAt: verification.updatedAt.toISOString(),
//           student: studentData,
//           school: schoolData
//         };
//
//         transformedVerifications.push(transformedVerification);
//         console.log(`[AdminVerification] Successfully processed verification:`, verification.id);
//
//       } catch (error) {
//         console.error(`[AdminVerification] Error processing verification ${verification.id}:`, error);
//         // Continue processing other verifications even if one fails
//       }
//     }
//
//     console.log(`[AdminVerification] Final transformed verifications count:`, transformedVerifications.length);
//
//     res.json({
//       success: true,
//       verifications: transformedVerifications,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         totalCount,
//         totalPages: Math.ceil(totalCount / Number(limit)),
//         hasNext: skip + Number(limit) < totalCount,
//         hasPrev: Number(page) > 1
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching verifications:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verifications',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/approve - Approve a verification
// router.post('/verifications/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { notes } = req.body;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} approving verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id },
//       include: {
//         student: {
//           select: { id: true, userId: true }
//         }
//       }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only approve pending verifications' });
//     }
//
//     // Start transaction to update both verification and student records
//     const result = await prisma.$transaction(async (tx) => {
//       // Update verification status
//       const updatedVerification = await tx.schoolVerification.update({
//         where: { id },
//         data: {
//           status: 'approved',
//           verifiedAt: new Date(),
//           rejectionReason: null,
//           updatedAt: new Date()
//         },
//         include: {
//           student: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true
//             }
//           },
//           school: {
//             select: {
//               name: true,
//               domain: true
//             }
//           }
//         }
//       });
//
//       // Update student verified status
//       await tx.student.update({
//         where: { id: verification.student.id },
//         data: { verified: true }
//       });
//
//       return updatedVerification;
//     });
//
//     console.log(`[AdminVerification] Verification ${id} approved successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification approved successfully',
//       verification: {
//         id: result.id,
//         status: result.status,
//         verifiedAt: result.verifiedAt?.toISOString(),
//         student: result.student,
//         school: result.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error approving verification:', error);
//     res.status(500).json({
//       error: 'Failed to approve verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/reject - Reject a verification
// router.post('/verifications/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { rejectionReason } = req.body;
//
//     if (!rejectionReason || rejectionReason.trim().length === 0) {
//       return res.status(400).json({ error: 'Rejection reason is required' });
//     }
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} rejecting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only reject pending verifications' });
//     }
//
//     // Update verification status
//     const updatedVerification = await prisma.schoolVerification.update({
//       where: { id },
//       data: {
//         status: 'rejected',
//         rejectionReason: rejectionReason.trim(),
//         verifiedAt: new Date(),
//         updatedAt: new Date()
//       },
//       include: {
//         student: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true
//           }
//         },
//         school: {
//           select: {
//             name: true,
//             domain: true
//           }
//         }
//       }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} rejected successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification rejected successfully',
//       verification: {
//         id: updatedVerification.id,
//         status: updatedVerification.status,
//         rejectionReason: updatedVerification.rejectionReason,
//         verifiedAt: updatedVerification.verifiedAt?.toISOString(),
//         student: updatedVerification.student,
//         school: updatedVerification.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error rejecting verification:', error);
//     res.status(500).json({
//       error: 'Failed to reject verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // GET /api/admin/verifications/stats - Get verification statistics
// router.get('/verifications/stats', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching verification statistics...');
//
//     const stats = await prisma.schoolVerification.groupBy({
//       by: ['status'],
//       _count: {
//         status: true
//       }
//     });
//
//     const totalVerifications = await prisma.schoolVerification.count();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);
//
//     const todayVerifications = await prisma.schoolVerification.count({
//       where: {
//         createdAt: {
//           gte: todayStart
//         }
//       }
//     });
//
//     const statsMap = stats.reduce((acc, stat) => {
//       acc[stat.status] = stat._count.status;
//       return acc;
//     }, {} as Record<string, number>);
//
//     const response = {
//       total: totalVerifications,
//       today: todayVerifications,
//       pending: statsMap.pending || 0,
//       approved: statsMap.approved || 0,
//       rejected: statsMap.rejected || 0
//     };
//
//     console.log('[AdminVerification] Stats:', response);
//
//     res.json({
//       success: true,
//       stats: response
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // DELETE /api/admin/verifications/:id - Delete a verification (admin only)
// router.delete('/verifications/:id', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} deleting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     // Delete the verification
//     await prisma.schoolVerification.delete({
//       where: { id }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} deleted successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification deleted successfully'
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error deleting verification:', error);
//     res.status(500).json({
//       error: 'Failed to delete verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // Add this to your admin routes to test if new code is deployed
// router.get('/debug/test-new-code', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] NEW CODE TEST - This should appear in logs');
//
//     // Simple query without any complexity
//     const count = await prisma.schoolVerification.count();
//     const verifications = await prisma.schoolVerification.findMany({ take: 1 });
//
//     console.log('[AdminVerification] NEW CODE TEST - Found', count, 'total verifications');
//
//     res.json({
//       success: true,
//       message: "NEW CODE IS RUNNING",
//       totalCount: count,
//       sampleVerification: verifications[0] || null
//     });
//   } catch (error) {
//         console.error('[AdminVerification] Error deleting verification:', error);
//         res.status(500).json({
//           error: 'Failed to delete verification',
//           details: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     });
//
// export default router;




// // backend/src/routes/admin-verification.ts
// import express from 'express';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticateToken } from '../middleware/auth';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Admin authentication middleware
// const authenticateAdmin = async (req: any, res: Response, next: any) => {
//   try {
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     // Check if user is an admin
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
//
// // GET /api/admin/verifications - Get all pending verifications
// router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching all verifications...');
//
//     const { status, page = 1, limit = 20 } = req.query;
//     const skip = (Number(page) - 1) * Number(limit);
//
//     // Build where clause
//     const whereClause: any = {};
//     if (status && status !== 'all') {
//       whereClause.status = status;
//     }
//
//     // Get verifications without includes first
//     const verifications = await prisma.schoolVerification.findMany({
//       where: whereClause,
//       orderBy: {
//         createdAt: 'desc'
//       },
//       skip: skip,
//       take: Number(limit)
//     });
//
//     console.log(`[AdminVerification] Raw verifications from DB:`, verifications.length);
//
//     // Get total count for pagination
//     const totalCount = await prisma.schoolVerification.count({
//       where: whereClause
//     });
//
//     console.log(`[AdminVerification] Total count:`, totalCount);
//
//     // Manually fetch related data for each verification
//     const transformedVerifications = await Promise.all(
//       verifications.map(async (verification) => {
//         console.log(`[AdminVerification] Processing verification:`, verification.id);
//
//         // Fetch student data separately
//         let studentData = { id: 'unknown', firstName: 'Unknown', lastName: 'User', email: 'No email' };
//         try {
//           const student = await prisma.student.findUnique({
//             where: { id: verification.studentId },
//             select: { id: true, firstName: true, lastName: true, email: true }
//           });
//           if (student) {
//             studentData = student;
//           }
//         } catch (error) {
//           console.error(`[AdminVerification] Error fetching student ${verification.studentId}:`, error);
//         }
//
//         // Fetch school data separately
//         let schoolData = { id: 'unknown', name: 'Unknown School', domain: null as string | null };
//         try {
//           const school = await prisma.school.findUnique({
//             where: { id: verification.schoolId },
//             select: { id: true, name: true, domain: true }
//           });
//           if (school) {
//             schoolData = school;
//           }
//         } catch (error) {
//           console.error(`[AdminVerification] Error fetching school ${verification.schoolId}:`, error);
//         }
//
//         return {
//           id: verification.id,
//           status: verification.status,
//           verificationMethod: verification.verificationMethod,
//           verificationEmail: verification.verificationEmail,
//           verificationDocument: verification.verificationDocument,
//           rejectionReason: verification.rejectionReason,
//           createdAt: verification.createdAt.toISOString(),
//           verifiedAt: verification.verifiedAt?.toISOString(),
//           updatedAt: verification.updatedAt.toISOString(),
//           student: studentData,
//           school: schoolData
//         };
//       })
//     );
//
//     console.log(`[AdminVerification] Found ${verifications.length} verifications`);
//
//     res.json({
//       success: true,
//       verifications: transformedVerifications,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         totalCount,
//         totalPages: Math.ceil(totalCount / Number(limit)),
//         hasNext: skip + Number(limit) < totalCount,
//         hasPrev: Number(page) > 1
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching verifications:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verifications',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/approve - Approve a verification
// router.post('/verifications/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { notes } = req.body;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} approving verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id },
//       include: {
//         student: {
//           select: { id: true, userId: true }
//         }
//       }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only approve pending verifications' });
//     }
//
//     // Start transaction to update both verification and student records
//     const result = await prisma.$transaction(async (tx) => {
//       // Update verification status
//       const updatedVerification = await tx.schoolVerification.update({
//         where: { id },
//         data: {
//           status: 'approved',
//           verifiedAt: new Date(),
//           rejectionReason: null,
//           updatedAt: new Date()
//         },
//         include: {
//           student: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true
//             }
//           },
//           school: {
//             select: {
//               name: true,
//               domain: true
//             }
//           }
//         }
//       });
//
//       // Update student verified status
//       await tx.student.update({
//         where: { id: verification.student.id },
//         data: { verified: true }
//       });
//
//       return updatedVerification;
//     });
//
//     console.log(`[AdminVerification] Verification ${id} approved successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification approved successfully',
//       verification: {
//         id: result.id,
//         status: result.status,
//         verifiedAt: result.verifiedAt?.toISOString(),
//         student: result.student,
//         school: result.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error approving verification:', error);
//     res.status(500).json({
//       error: 'Failed to approve verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/reject - Reject a verification
// router.post('/verifications/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { rejectionReason } = req.body;
//
//     if (!rejectionReason || rejectionReason.trim().length === 0) {
//       return res.status(400).json({ error: 'Rejection reason is required' });
//     }
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} rejecting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only reject pending verifications' });
//     }
//
//     // Update verification status
//     const updatedVerification = await prisma.schoolVerification.update({
//       where: { id },
//       data: {
//         status: 'rejected',
//         rejectionReason: rejectionReason.trim(),
//         verifiedAt: new Date(),
//         updatedAt: new Date()
//       },
//       include: {
//         student: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true
//           }
//         },
//         school: {
//           select: {
//             name: true,
//             domain: true
//           }
//         }
//       }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} rejected successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification rejected successfully',
//       verification: {
//         id: updatedVerification.id,
//         status: updatedVerification.status,
//         rejectionReason: updatedVerification.rejectionReason,
//         verifiedAt: updatedVerification.verifiedAt?.toISOString(),
//         student: updatedVerification.student,
//         school: updatedVerification.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error rejecting verification:', error);
//     res.status(500).json({
//       error: 'Failed to reject verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // GET /api/admin/verifications/stats - Get verification statistics
// router.get('/verifications/stats', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching verification statistics...');
//
//     const stats = await prisma.schoolVerification.groupBy({
//       by: ['status'],
//       _count: {
//         status: true
//       }
//     });
//
//     const totalVerifications = await prisma.schoolVerification.count();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);
//
//     const todayVerifications = await prisma.schoolVerification.count({
//       where: {
//         createdAt: {
//           gte: todayStart
//         }
//       }
//     });
//
//     const statsMap = stats.reduce((acc, stat) => {
//       acc[stat.status] = stat._count.status;
//       return acc;
//     }, {} as Record<string, number>);
//
//     const response = {
//       total: totalVerifications,
//       today: todayVerifications,
//       pending: statsMap.pending || 0,
//       approved: statsMap.approved || 0,
//       rejected: statsMap.rejected || 0
//     };
//
//     console.log('[AdminVerification] Stats:', response);
//
//     res.json({
//       success: true,
//       stats: response
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // DELETE /api/admin/verifications/:id - Delete a verification (admin only)
// router.delete('/verifications/:id', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} deleting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     // Delete the verification
//     await prisma.schoolVerification.delete({
//       where: { id }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} deleted successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification deleted successfully'
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error deleting verification:', error);
//     res.status(500).json({
//       error: 'Failed to delete verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // Add this to your admin routes temporarily
// router.get('/debug/test-where-clause', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { status } = req.query;
//
//     // Build where clause (same logic as main endpoint)
//     const whereClause: any = {};
//     if (status && status !== 'all') {
//       whereClause.status = status;
//     }
//
//     console.log('[DEBUG] Where clause:', whereClause);
//     console.log('[DEBUG] Status param:', status);
//
//     // Test the query
//     const count = await prisma.schoolVerification.count({ where: whereClause });
//     const verifications = await prisma.schoolVerification.findMany({
//       where: whereClause,
//       take: 2
//     });
//
//     res.json({
//       success: true,
//       statusParam: status,
//       whereClause,
//       count,
//       sampleIds: verifications.map(v => ({ id: v.id, status: v.status }))
//     });
//   } catch (error) {
//         console.error('[AdminVerification] Error deleting verification:', error);
//         res.status(500).json({
//           error: 'Failed to delete verification',
//           details: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     });
//
//
// export default router;




// // backend/src/routes/admin-verification.ts
// import express from 'express';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticateToken } from '../middleware/auth';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Admin authentication middleware
// const authenticateAdmin = async (req: any, res: Response, next: any) => {
//   try {
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     // Check if user is an admin
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
//
// // GET /api/admin/verifications - Get all pending verifications
// router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching all verifications...');
//
//     const { status, page = 1, limit = 20 } = req.query;
//     const skip = (Number(page) - 1) * Number(limit);
//
//     // Build where clause
//     const whereClause: any = {};
//     if (status && status !== 'all') {
//       whereClause.status = status;
//     }
//
//     const verifications = await prisma.schoolVerification.findMany({
//       where: whereClause,
//       include: {
//         student: true, // Include all student fields
//         school: true   // Include all school fields
//       },
//       orderBy: {
//         createdAt: 'desc'
//       },
//       skip: skip,
//       take: Number(limit)
//     });
//
//     console.log(`[AdminVerification] Raw verifications from DB:`, verifications.length);
//     console.log(`[AdminVerification] First verification sample:`, verifications[0] || 'No verifications found');
//
//     // Get total count for pagination
//     const totalCount = await prisma.schoolVerification.count({
//       where: whereClause
//     });
//
//     console.log(`[AdminVerification] Total count:`, totalCount);
//
//     // Transform data for frontend
//     const transformedVerifications = verifications.map(verification => {
//       console.log(`[AdminVerification] Processing verification:`, {
//         id: verification.id,
//         status: verification.status,
//         studentData: verification.student ? 'Found' : 'Missing',
//         schoolData: verification.school ? 'Found' : 'Missing'
//       });
//
//       return {
//         id: verification.id,
//         status: verification.status,
//         verificationMethod: verification.verificationMethod,
//         verificationEmail: verification.verificationEmail,
//         verificationDocument: verification.verificationDocument,
//         rejectionReason: verification.rejectionReason,
//         createdAt: verification.createdAt.toISOString(),
//         verifiedAt: verification.verifiedAt?.toISOString(),
//         updatedAt: verification.updatedAt.toISOString(),
//         student: {
//           id: verification.student?.id || 'unknown',
//           firstName: verification.student?.firstName || 'Unknown',
//           lastName: verification.student?.lastName || 'User',
//           email: verification.student?.email || 'No email'
//         },
//         school: verification.school || { id: 'unknown', name: 'Unknown School', domain: null }
//       };
//     });
//
//     console.log(`[AdminVerification] Found ${verifications.length} verifications`);
//
//     res.json({
//       success: true,
//       verifications: transformedVerifications,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         totalCount,
//         totalPages: Math.ceil(totalCount / Number(limit)),
//         hasNext: skip + Number(limit) < totalCount,
//         hasPrev: Number(page) > 1
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching verifications:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verifications',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/approve - Approve a verification
// router.post('/verifications/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { notes } = req.body;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} approving verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id },
//       include: {
//         student: {
//           select: { id: true, userId: true }
//         }
//       }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only approve pending verifications' });
//     }
//
//     // Start transaction to update both verification and student records
//     const result = await prisma.$transaction(async (tx) => {
//       // Update verification status
//       const updatedVerification = await tx.schoolVerification.update({
//         where: { id },
//         data: {
//           status: 'approved',
//           verifiedAt: new Date(),
//           rejectionReason: null,
//           updatedAt: new Date()
//         },
//         include: {
//           student: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true
//             }
//           },
//           school: {
//             select: {
//               name: true,
//               domain: true
//             }
//           }
//         }
//       });
//
//       // Update student verified status
//       await tx.student.update({
//         where: { id: verification.student.id },
//         data: { verified: true }
//       });
//
//       return updatedVerification;
//     });
//
//     console.log(`[AdminVerification] Verification ${id} approved successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification approved successfully',
//       verification: {
//         id: result.id,
//         status: result.status,
//         verifiedAt: result.verifiedAt?.toISOString(),
//         student: result.student,
//         school: result.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error approving verification:', error);
//     res.status(500).json({
//       error: 'Failed to approve verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/reject - Reject a verification
// router.post('/verifications/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { rejectionReason } = req.body;
//
//     if (!rejectionReason || rejectionReason.trim().length === 0) {
//       return res.status(400).json({ error: 'Rejection reason is required' });
//     }
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} rejecting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only reject pending verifications' });
//     }
//
//     // Update verification status
//     const updatedVerification = await prisma.schoolVerification.update({
//       where: { id },
//       data: {
//         status: 'rejected',
//         rejectionReason: rejectionReason.trim(),
//         verifiedAt: new Date(),
//         updatedAt: new Date()
//       },
//       include: {
//         student: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true
//           }
//         },
//         school: {
//           select: {
//             name: true,
//             domain: true
//           }
//         }
//       }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} rejected successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification rejected successfully',
//       verification: {
//         id: updatedVerification.id,
//         status: updatedVerification.status,
//         rejectionReason: updatedVerification.rejectionReason,
//         verifiedAt: updatedVerification.verifiedAt?.toISOString(),
//         student: updatedVerification.student,
//         school: updatedVerification.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error rejecting verification:', error);
//     res.status(500).json({
//       error: 'Failed to reject verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // Add this to your admin-verification.ts file temporarily
// router.get('/debug/raw-data', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[DEBUG] Fetching raw verification data...');
//
//     // Get raw data without any filtering
//     const rawVerifications = await prisma.schoolVerification.findMany({
//       take: 10,
//       orderBy: { createdAt: 'desc' }
//     });
//
//     console.log('[DEBUG] Raw verifications found:', rawVerifications.length);
//
//     // Get unique status values
//     const statusValues = [...new Set(rawVerifications.map(v => v.status))];
//
//     console.log('[DEBUG] Unique status values:', statusValues);
//
//     res.json({
//       success: true,
//       count: rawVerifications.length,
//       statusValues: statusValues,
//       sampleData: rawVerifications.map(v => ({
//         id: v.id,
//         status: v.status,
//         createdAt: v.createdAt,
//         studentId: v.studentId,
//         schoolId: v.schoolId
//       }))
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics',
//       details: error instanceof Error ? error.message : 'Unknown error'
//   });
//   }
// });
//
// // GET /api/admin/verifications/stats - Get verification statistics
// router.get('/verifications/stats', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching verification statistics...');
//
//     const stats = await prisma.schoolVerification.groupBy({
//       by: ['status'],
//       _count: {
//         status: true
//       }
//     });
//
//     const totalVerifications = await prisma.schoolVerification.count();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);
//
//     const todayVerifications = await prisma.schoolVerification.count({
//       where: {
//         createdAt: {
//           gte: todayStart
//         }
//       }
//     });
//
//     const statsMap = stats.reduce((acc, stat) => {
//       acc[stat.status] = stat._count.status;
//       return acc;
//     }, {} as Record<string, number>);
//
//     const response = {
//       total: totalVerifications,
//       today: todayVerifications,
//       pending: statsMap.pending || 0,
//       approved: statsMap.approved || 0,
//       rejected: statsMap.rejected || 0
//     };
//
//     console.log('[AdminVerification] Stats:', response);
//
//     res.json({
//       success: true,
//       stats: response
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
//
// // Check if students exist
// router.get('/debug/check-students', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const studentIds = [
//       "5188387a-ee3a-42cf-a3eb-a32aac90923d",
//       "9ea73359-d188-4147-8d0d-6cc30d49a435",
//       "1931c911-1447-4eb3-a21b-8a9f8eae6ee5",
//       "0cadae91-30dc-4efc-8db6-6015f7c1e2c7",
//       "0b54058e-36ea-4005-8019-23551c095c40"
//     ];
//
//     const students = await prisma.student.findMany({
//       where: { id: { in: studentIds } },
//       select: { id: true, firstName: true, lastName: true, email: true }
//     });
//
//     res.json({
//       success: true,
//       studentsFound: students.length,
//       studentsExpected: studentIds.length,
//       students
//     });
//   } catch (error) {
//         console.error('[AdminVerification] Error fetching stats:', error);
//         res.status(500).json({
//           error: 'Failed to fetch verification statistics',
//           details: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     });
//
// // Check if schools exist
// router.get('/debug/check-schools', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const schoolIds = [
//       "904c5939-ddd7-4de2-a962-06d55f05bb22",
//       "a22baf17-3b31-4c48-a280-37fc3fddc697",
//       "d681f46a-98d9-4f82-9171-5c0b418230d2"
//     ];
//
//     const schools = await prisma.school.findMany({
//       where: { id: { in: schoolIds } },
//       select: { id: true, name: true, domain: true }
//     });
//
//     res.json({
//       success: true,
//       schoolsFound: schools.length,
//       schoolsExpected: schoolIds.length,
//       schools
//     });
//   } catch (error) {
//         console.error('[AdminVerification] Error fetching stats:', error);
//         res.status(500).json({
//           error: 'Failed to fetch verification statistics',
//           details: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     });
//
// // Simple verifications without includes
// router.get('/debug/simple-verifications', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const verifications = await prisma.schoolVerification.findMany({
//       where: { status: 'approved' },
//       take: 5
//     });
//
//     res.json({
//       success: true,
//       count: verifications.length,
//       verifications
//     });
//   } catch (error) {
//             console.error('[AdminVerification] Error fetching stats:', error);
//             res.status(500).json({
//               error: 'Failed to fetch verification statistics',
//               details: error instanceof Error ? error.message : 'Unknown error'
//             });
//           }
//         });
//
//
// // Test student relationship only
// router.get('/debug/test-student-include', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const verifications = await prisma.schoolVerification.findMany({
//       where: { status: 'approved' },
//       include: {
//         student: true  // Include all student fields
//       },
//       take: 2
//     });
//
//     res.json({
//       success: true,
//       count: verifications.length,
//       hasStudentData: verifications.map(v => ({
//         id: v.id,
//         studentExists: !!v.student,
//         studentData: v.student ? {
//           id: v.student.id,
//           firstName: v.student.firstName,
//           lastName: v.student.lastName,
//           email: v.student.email
//         } : null
//       }))
//     });
//   } catch (error) {
//                 console.error('[AdminVerification] Error fetching stats:', error);
//                 res.status(500).json({
//                   error: 'Failed to fetch verification statistics',
//                   details: error instanceof Error ? error.message : 'Unknown error'
//                 });
//               }
//             });
//
//
// // Test school relationship only
// router.get('/debug/test-school-include', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const verifications = await prisma.schoolVerification.findMany({
//       where: { status: 'approved' },
//       include: {
//         school: true  // Include all school fields
//       },
//       take: 2
//     });
//
//     res.json({
//       success: true,
//       count: verifications.length,
//       hasSchoolData: verifications.map(v => ({
//         id: v.id,
//         schoolExists: !!v.school,
//         schoolData: v.school ? {
//           id: v.school.id,
//           name: v.school.name,
//           domain: v.school.domain
//         } : null
//       }))
//     });
//   } catch (error) {
//                 console.error('[AdminVerification] Error fetching stats:', error);
//                 res.status(500).json({
//                   error: 'Failed to fetch verification statistics',
//                   details: error instanceof Error ? error.message : 'Unknown error'
//                 });
//               }
//             });
//
//
// // DELETE /api/admin/verifications/:id - Delete a verification (admin only)
// router.delete('/verifications/:id', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} deleting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     // Delete the verification
//     await prisma.schoolVerification.delete({
//       where: { id }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} deleted successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification deleted successfully'
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error deleting verification:', error);
//     res.status(500).json({
//       error: 'Failed to delete verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// export default router;



// // backend/src/routes/admin-verification.ts
// import express from 'express';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticateToken } from '../middleware/auth';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Admin authentication middleware
// const authenticateAdmin = async (req: any, res: Response, next: any) => {
//   try {
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     // Check if user is an admin
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
//
// // GET /api/admin/verifications - Get all pending verifications
// router.get('/verifications', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching all verifications...');
//
//     const { status, page = 1, limit = 20 } = req.query;
//     const skip = (Number(page) - 1) * Number(limit);
//
//     // Build where clause
//     const whereClause: any = {};
//     if (status && status !== 'all') {
//       whereClause.status = status;
//     }
//
//     const verifications = await prisma.schoolVerification.findMany({
//       where: whereClause,
//       include: {
//         student: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true
//           }
//         },
//         school: {
//           select: {
//             id: true,
//             name: true,
//             domain: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       },
//       skip: skip,
//       take: Number(limit)
//     });
//
//     // Get total count for pagination
//     const totalCount = await prisma.schoolVerification.count({
//       where: whereClause
//     });
//
//     // Transform data for frontend
//     const transformedVerifications = verifications.map(verification => ({
//       id: verification.id,
//       status: verification.status,
//       verificationMethod: verification.verificationMethod,
//       verificationEmail: verification.verificationEmail,
//       verificationDocument: verification.verificationDocument,
//       rejectionReason: verification.rejectionReason,
//       createdAt: verification.createdAt.toISOString(),
//       verifiedAt: verification.verifiedAt?.toISOString(),
//       updatedAt: verification.updatedAt.toISOString(),
//       student: {
//         id: verification.student.id,
//         firstName: verification.student.firstName,
//         lastName: verification.student.lastName,
//         email: verification.student.email
//       },
//       school: verification.school
//     }));
//
//     console.log(`[AdminVerification] Found ${verifications.length} verifications`);
//
//     res.json({
//       success: true,
//       verifications: transformedVerifications,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         totalCount,
//         totalPages: Math.ceil(totalCount / Number(limit)),
//         hasNext: skip + Number(limit) < totalCount,
//         hasPrev: Number(page) > 1
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching verifications:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verifications',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/approve - Approve a verification
// router.post('/verifications/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { notes } = req.body;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} approving verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id },
//       include: {
//         student: {
//           select: { id: true, userId: true }
//         }
//       }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only approve pending verifications' });
//     }
//
//     // Start transaction to update both verification and student records
//     const result = await prisma.$transaction(async (tx) => {
//       // Update verification status
//       const updatedVerification = await tx.schoolVerification.update({
//         where: { id },
//         data: {
//           status: 'approved',
//           verifiedAt: new Date(),
//           rejectionReason: null,
//           updatedAt: new Date()
//         },
//         include: {
//           student: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true
//             }
//           },
//           school: {
//             select: {
//               name: true,
//               domain: true
//             }
//           }
//         }
//       });
//
//       // Update student verified status
//       await tx.student.update({
//         where: { id: verification.student.id },
//         data: { verified: true }
//       });
//
//       return updatedVerification;
//     });
//
//     console.log(`[AdminVerification] Verification ${id} approved successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification approved successfully',
//       verification: {
//         id: result.id,
//         status: result.status,
//         verifiedAt: result.verifiedAt?.toISOString(),
//         student: result.student,
//         school: result.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error approving verification:', error);
//     res.status(500).json({
//       error: 'Failed to approve verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/admin/verifications/:id/reject - Reject a verification
// router.post('/verifications/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { rejectionReason } = req.body;
//
//     if (!rejectionReason || rejectionReason.trim().length === 0) {
//       return res.status(400).json({ error: 'Rejection reason is required' });
//     }
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} rejecting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     if (verification.status !== 'pending') {
//       return res.status(400).json({ error: 'Can only reject pending verifications' });
//     }
//
//     // Update verification status
//     const updatedVerification = await prisma.schoolVerification.update({
//       where: { id },
//       data: {
//         status: 'rejected',
//         rejectionReason: rejectionReason.trim(),
//         verifiedAt: new Date(),
//         updatedAt: new Date()
//       },
//       include: {
//         student: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true
//           }
//         },
//         school: {
//           select: {
//             name: true,
//             domain: true
//           }
//         }
//       }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} rejected successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification rejected successfully',
//       verification: {
//         id: updatedVerification.id,
//         status: updatedVerification.status,
//         rejectionReason: updatedVerification.rejectionReason,
//         verifiedAt: updatedVerification.verifiedAt?.toISOString(),
//         student: updatedVerification.student,
//         school: updatedVerification.school
//       }
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error rejecting verification:', error);
//     res.status(500).json({
//       error: 'Failed to reject verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // GET /api/admin/verifications/stats - Get verification statistics
// router.get('/verifications/stats', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     console.log('[AdminVerification] Fetching verification statistics...');
//
//     const stats = await prisma.schoolVerification.groupBy({
//       by: ['status'],
//       _count: {
//         status: true
//       }
//     });
//
//     const totalVerifications = await prisma.schoolVerification.count();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);
//
//     const todayVerifications = await prisma.schoolVerification.count({
//       where: {
//         createdAt: {
//           gte: todayStart
//         }
//       }
//     });
//
//     const statsMap = stats.reduce((acc, stat) => {
//       acc[stat.status] = stat._count.status;
//       return acc;
//     }, {} as Record<string, number>);
//
//     const response = {
//       total: totalVerifications,
//       today: todayVerifications,
//       pending: statsMap.pending || 0,
//       approved: statsMap.approved || 0,
//       rejected: statsMap.rejected || 0
//     };
//
//     console.log('[AdminVerification] Stats:', response);
//
//     res.json({
//       success: true,
//       stats: response
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error fetching stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // DELETE /api/admin/verifications/:id - Delete a verification (admin only)
// router.delete('/verifications/:id', authenticateAdmin, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//
//     console.log(`[AdminVerification] Admin ${req.user?.id} deleting verification ${id}`);
//
//     // Find the verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { id }
//     });
//
//     if (!verification) {
//       return res.status(404).json({ error: 'Verification not found' });
//     }
//
//     // Delete the verification
//     await prisma.schoolVerification.delete({
//       where: { id }
//     });
//
//     console.log(`[AdminVerification] Verification ${id} deleted successfully`);
//
//     res.json({
//       success: true,
//       message: 'Verification deleted successfully'
//     });
//   } catch (error) {
//     console.error('[AdminVerification] Error deleting verification:', error);
//     res.status(500).json({
//       error: 'Failed to delete verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// export default router;