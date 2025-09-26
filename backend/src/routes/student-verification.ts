// backend/src/routes/student-verification.ts
import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Student authentication middleware
const authenticateStudent = async (req: any, res: Response, next: any) => {
  try {
    // First check if user is authenticated
    await authenticateToken(req, res, () => {});

    if (res.headersSent) return; // If authenticateToken sent a response, stop here

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a student
    if (req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    next();
  } catch (error) {
    console.error('Student auth error:', error);
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Invalid student authentication' });
    }
  }
};

// GET /api/students/schools - Get available schools
router.get('/schools', authenticateStudent, async (req: Request, res: Response) => {
  try {
    console.log('[StudentVerification] Fetching available schools...');

    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        verificationMethods: true,
      },
      orderBy: { name: 'asc' }
    });

    console.log(`[StudentVerification] Found ${schools.length} schools`);

    res.json({
      success: true,
      schools: schools
    });
  } catch (error) {
    console.error('[StudentVerification] Error fetching schools:', error);
    res.status(500).json({
      error: 'Failed to fetch schools',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/students/verification-status - Check student's verification status
router.get('/verification-status', authenticateStudent, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    console.log(`[StudentVerification] Checking verification status for user ${user?.id}`);

    // Try to find student by id (since Student model has its own auth)
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      select: { id: true, verified: true }
    });

    if (!student) {
      console.log(`[StudentVerification] No student record found for user ${user.id}`);
      return res.status(404).json({
        error: 'Student record not found',
        debug: { searchedId: user.id }
      });
    }

    console.log(`[StudentVerification] Found student record:`, student);

    // Check for existing verification
    const verification = await prisma.schoolVerification.findUnique({
      where: { studentId: student.id },
      include: {
        school: {
          select: { name: true, domain: true }
        }
      }
    });

    let verificationStatus: any = {
      status: 'not_submitted' as const,
      verified: student.verified
    };

    if (verification) {
      verificationStatus = {
        ...verificationStatus,
        id: verification.id,
        status: verification.status, // Remove the type assertion
        rejectionReason: verification.rejectionReason,
        createdAt: verification.createdAt.toISOString(),
        verifiedAt: verification.verifiedAt?.toISOString(),
        school: verification.school,
        verificationMethod: verification.verificationMethod
      };
    }

    console.log(`[StudentVerification] Returning status:`, verificationStatus);

    res.json({
      success: true,
      verification: verificationStatus
    });
  } catch (error) {
    console.error('[StudentVerification] Error checking verification status:', error);
    res.status(500).json({
      error: 'Failed to check verification status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/students/submit-verification - Submit verification for review
router.post('/submit-verification', authenticateStudent, async (req: Request, res: Response) => {
  try {
    const { schoolId, verificationMethod, verificationEmail, verificationDocument } = req.body;
    const user = req.user;

    console.log(`[StudentVerification] Student ${user?.id} submitting verification:`, {
      schoolId,
      verificationMethod,
      verificationEmail: verificationEmail ? '***@***' : undefined,
      hasDocument: !!verificationDocument
    });

    // Validation
    if (!schoolId || !verificationMethod) {
      return res.status(400).json({ error: 'School ID and verification method are required' });
    }

    if (!['email', 'id_card', 'transcript', 'document'].includes(verificationMethod)) {
      return res.status(400).json({ error: 'Invalid verification method' });
    }

    if (verificationMethod === 'email' && !verificationEmail) {
      return res.status(400).json({ error: 'Email address is required for email verification' });
    }

    if (verificationMethod !== 'email' && !verificationDocument) {
      return res.status(400).json({ error: 'Document is required for document verification' });
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      select: { id: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, verificationMethods: true }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Check if verification method is supported by the school
    if (!school.verificationMethods.includes(verificationMethod)) {
      return res.status(400).json({ error: 'Verification method not supported by this school' });
    }

    // Check for existing verification
    const existingVerification = await prisma.schoolVerification.findUnique({
      where: { studentId: student.id }
    });

    if (existingVerification && existingVerification.status === 'pending') {
      return res.status(409).json({
        error: 'You already have a pending verification. Please wait for it to be processed.'
      });
    }

    if (existingVerification && existingVerification.status === 'approved') {
      return res.status(409).json({
        error: 'Your account is already verified.'
      });
    }

    // Create or update verification record
    const verificationData = {
      studentId: student.id,
      schoolId: schoolId,
      verificationMethod: verificationMethod,
      status: 'pending',
      ...(verificationMethod === 'email' && { verificationEmail }),
      ...(verificationMethod !== 'email' && { verificationDocument }),
    };

    let verification;
    if (existingVerification) {
      // Update existing verification (e.g., if previous was rejected)
      verification = await prisma.schoolVerification.update({
        where: { id: existingVerification.id },
        data: {
          ...verificationData,
          rejectionReason: null, // Clear previous rejection reason
          updatedAt: new Date(),
        },
        include: {
          school: {
            select: { name: true, domain: true }
          }
        }
      });
    } else {
      // Create new verification
      verification = await prisma.schoolVerification.create({
        data: verificationData,
        include: {
          school: {
            select: { name: true, domain: true }
          }
        }
      });
    }

    console.log(`[StudentVerification] Verification submitted successfully:`, verification.id);

    res.json({
      success: true,
      message: 'Verification submitted successfully',
      verification: {
        id: verification.id,
        status: verification.status,
        verificationMethod: verification.verificationMethod,
        school: verification.school,
        createdAt: verification.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('[StudentVerification] Error submitting verification:', error);
    res.status(500).json({
      error: 'Failed to submit verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;





// // backend/src/routes/student-verification.ts
// import express from 'express';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticateToken } from '../middleware/auth';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Student authentication middleware
// const authenticateStudent = async (req: any, res: Response, next: any) => {
//   try {
//     console.log('🔐 [StudentAuth] Starting authentication...');
//     console.log('🔐 [StudentAuth] Request headers:', req.headers);
//     console.log('🔐 [StudentAuth] Authorization header:', req.headers.authorization);
//
//     // First check if user is authenticated
//     await authenticateToken(req, res, () => {});
//
//     console.log('🔐 [StudentAuth] After authenticateToken, req.user:', req.user);
//
//     if (!req.user) {
//       console.log('❌ [StudentAuth] No user found after authentication');
//       return res.status(401).json({ error: 'Authentication required' });
//     }
//
//     console.log('🔐 [StudentAuth] User found:', req.user);
//     console.log('🔐 [StudentAuth] User type:', req.user.userType);
//
//     // Check if user is a student
//     if (req.user.userType !== 'student') {
//       console.log('❌ [StudentAuth] User is not a student:', req.user.userType);
//       return res.status(403).json({ error: 'Student access required' });
//     }
//
//     console.log('✅ [StudentAuth] Student authentication successful');
//     next();
//   } catch (error) {
//     console.error('💥 [StudentAuth] Authentication error:', error);
//     return res.status(401).json({ error: 'Invalid student authentication' });
//   }
// };
//
// // GET /api/students/schools - Get available schools
// router.get('/schools', authenticateStudent, async (req: Request, res: Response) => {
//   try {
//     console.log('🔍 [StudentVerification API] /schools endpoint hit');
//     console.log('🔍 [StudentVerification API] Request user:', req.user);
//
//     console.log('🔍 [StudentVerification API] Fetching available schools...');
//
//     const schools = await prisma.school.findMany({
//       select: {
//         id: true,
//         name: true,
//         domain: true,
//         verificationMethods: true,
//       },
//       orderBy: { name: 'asc' }
//     });
//
//     console.log('✅ [StudentVerification API] Schools fetched from DB:', schools.length);
//     console.log('✅ [StudentVerification API] Schools data:', schools);
//
//     const response = {
//       success: true,
//       schools: schools
//     };
//
//     console.log('📤 [StudentVerification API] Sending response:', response);
//
//     res.json(response);
//   } catch (error) {
//     console.error('💥 [StudentVerification API] Error fetching schools:', error);
//     console.error('💥 [StudentVerification API] Error type:', typeof error);
//     console.error('💥 [StudentVerification API] Error message:', error instanceof Error ? error.message : 'Unknown error');
//     console.error('💥 [StudentVerification API] Error stack:', error instanceof Error ? error.stack : 'No stack');
//
//     res.status(500).json({
//       error: 'Failed to fetch schools',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // GET /api/students/verification-status - Check student's verification status
// router.get('/verification-status', authenticateStudent, async (req: Request, res: Response) => {
//   try {
//     const user = req.user; // Fix: Get user from req.user
//     console.log(`🔍 [StudentVerification API] Checking verification status for student ${user?.id}`);
//     console.log('🔍 [DEBUG] User from JWT:', { id: user.id, userType: user.userType, email: user.email });
//
//     // Try to find student by id (primary key)
//     let student = await prisma.student.findUnique({
//       where: { id: user.id },
//       select: { id: true, verified: true, userId: true }
//     });
//
//     console.log('🔍 [DEBUG] Student found by id:', student);
//
//     // If not found by id, try searching by userId (foreign key)
//     if (!student) {
//       console.log('🔍 [DEBUG] Student not found by id, trying userId...');
//       student = await prisma.student.findUnique({
//         where: { userId: user.id },
//         select: { id: true, verified: true, userId: true }
//       });
//       console.log('🔍 [DEBUG] Student found by userId:', student);
//     }
//
//     if (!student) {
//       console.log('❌ [DEBUG] Student not found with either id or userId:', user.id);
//       return res.status(404).json({
//         error: 'Student record not found',
//         debug: {
//           searchedById: user.id,
//           searchedByUserId: user.id,
//           foundStudent: false
//         }
//       });
//     }
//
//     console.log('✅ [DEBUG] Student record found:', student);
//
//     // Check for existing verification
//     const verification = await prisma.schoolVerification.findUnique({
//       where: { studentId: student.id },
//       include: {
//         school: {
//           select: { name: true, domain: true }
//         }
//       }
//     });
//
//     console.log('🔍 [DEBUG] Verification record:', verification);
//
//     let verificationStatus: any = {
//       status: 'not_submitted' as const,
//       verified: student.verified
//     };
//
//     if (verification) {
//       verificationStatus = {
//         ...verificationStatus,
//         id: verification.id,
//         status: verification.status,
//         rejectionReason: verification.rejectionReason,
//         createdAt: verification.createdAt.toISOString(),
//         verifiedAt: verification.verifiedAt?.toISOString(),
//         school: verification.school,
//         verificationMethod: verification.verificationMethod
//       };
//     }
//
//     console.log('📤 [DEBUG] Sending verification status:', verificationStatus);
//
//     res.json({
//       success: true,
//       verification: verificationStatus
//     });
//   } catch (error) {
//     console.error('💥 [StudentVerification API] Error checking verification status:', error);
//     res.status(500).json({
//       error: 'Failed to check verification status',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// // POST /api/students/submit-verification - Submit verification for review
// router.post('/submit-verification', authenticateStudent, async (req: Request, res: Response) => {
//   try {
//     const { schoolId, verificationMethod, verificationEmail, verificationDocument } = req.body;
//     const user = req.user; // Fix: Get user from req.user
//
//     console.log(`🔍 [StudentVerification API] Student ${user?.id} submitting verification:`, {
//       schoolId,
//       verificationMethod,
//       verificationEmail: verificationEmail ? '***@***' : undefined,
//       hasDocument: !!verificationDocument
//     });
//
//     // Validation
//     if (!schoolId || !verificationMethod) {
//       return res.status(400).json({ error: 'School ID and verification method are required' });
//     }
//
//     if (!['email', 'id_card', 'transcript', 'document'].includes(verificationMethod)) {
//       return res.status(400).json({ error: 'Invalid verification method' });
//     }
//
//     if (verificationMethod === 'email' && !verificationEmail) {
//       return res.status(400).json({ error: 'Email address is required for email verification' });
//     }
//
//     if (verificationMethod !== 'email' && !verificationDocument) {
//       return res.status(400).json({ error: 'Document is required for document verification' });
//     }
//
//     // Get student record - try both methods
//     let student = await prisma.student.findUnique({
//       where: { id: user.id },
//       select: { id: true }
//     });
//
//     if (!student) {
//       student = await prisma.student.findUnique({
//         where: { userId: user.id },
//         select: { id: true }
//       });
//     }
//
//     if (!student) {
//       return res.status(404).json({ error: 'Student record not found' });
//     }
//
//     // Check if school exists
//     const school = await prisma.school.findUnique({
//       where: { id: schoolId },
//       select: { id: true, name: true, verificationMethods: true }
//     });
//
//     if (!school) {
//       return res.status(404).json({ error: 'School not found' });
//     }
//
//     // Check if verification method is supported by the school
//     if (!school.verificationMethods.includes(verificationMethod)) {
//       return res.status(400).json({ error: 'Verification method not supported by this school' });
//     }
//
//     // Check for existing verification
//     const existingVerification = await prisma.schoolVerification.findUnique({
//       where: { studentId: student.id }
//     });
//
//     if (existingVerification && existingVerification.status === 'pending') {
//       return res.status(409).json({
//         error: 'You already have a pending verification. Please wait for it to be processed.'
//       });
//     }
//
//     if (existingVerification && existingVerification.status === 'approved') {
//       return res.status(409).json({
//         error: 'Your account is already verified.'
//       });
//     }
//
//     // Create or update verification record
//     const verificationData = {
//       studentId: student.id,
//       schoolId: schoolId,
//       verificationMethod: verificationMethod,
//       status: 'pending',
//       ...(verificationMethod === 'email' && { verificationEmail }),
//       ...(verificationMethod !== 'email' && { verificationDocument }),
//     };
//
//     let verification;
//     if (existingVerification) {
//       // Update existing verification (e.g., if previous was rejected)
//       verification = await prisma.schoolVerification.update({
//         where: { id: existingVerification.id },
//         data: {
//           ...verificationData,
//           rejectionReason: null, // Clear previous rejection reason
//           updatedAt: new Date(),
//         },
//         include: {
//           school: {
//             select: { name: true, domain: true }
//           }
//         }
//       });
//     } else {
//       // Create new verification
//       verification = await prisma.schoolVerification.create({
//         data: verificationData,
//         include: {
//           school: {
//             select: { name: true, domain: true }
//           }
//         }
//       });
//     }
//
//     console.log(`✅ [StudentVerification API] Verification submitted successfully:`, verification.id);
//
//     res.json({
//       success: true,
//       message: 'Verification submitted successfully',
//       verification: {
//         id: verification.id,
//         status: verification.status,
//         verificationMethod: verification.verificationMethod,
//         school: verification.school,
//         createdAt: verification.createdAt.toISOString()
//       }
//     });
//   } catch (error) {
//     console.error('💥 [StudentVerification API] Error submitting verification:', error);
//     res.status(500).json({
//       error: 'Failed to submit verification',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });
//
// export default router;