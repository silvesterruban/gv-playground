import { Router } from 'express';
import { SchoolVerificationService } from '../services/schoolVerificationService';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { requireVerifiedStudent } from '../middleware/student';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();
const upload = multer();

// Submit school verification request
router.post(
  '/submit',
  requireAuth,
  upload.single('verificationDocument'),
  async (req, res) => {
    try {
      const { studentId, schoolId, studentIdNumber, verificationMethod } = req.body;
      
      const verificationData = {
        studentId,
        schoolId,
        studentIdNumber,
        verificationMethod,
        verificationDocument: req.file?.buffer,
        documentType: req.file?.mimetype.split('/')[1]
      };

      const result = await SchoolVerificationService.submitVerification(verificationData);
      res.json(result);
    } catch (error) {
      console.error('Error submitting verification:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit verification'
      });
    }
  }
);

// Get verification status
router.get('/status/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const verification = await prisma.schoolVerification.findUnique({
      where: { studentId },
      include: {
        student: {
          select: {
            schoolVerified: true,
            studentIdVerified: true
          }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No verification request found'
      });
    }

    res.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status'
    });
  }
});

// Admin: Get all pending verifications
router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const verifications = await prisma.schoolVerification.findMany({
      where: {
        status: 'pending'
      },
      include: {
        student: {
          select: {
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({
      success: true,
      verifications
    });
  } catch (error) {
    console.error('Error getting pending verifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending verifications'
    });
  }
});

// Admin: Verify student
router.post('/verify/:studentId', requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { approved, reason } = req.body;
    const adminId = req.user.id;

    const result = await SchoolVerificationService.verifyStudent(
      studentId,
      adminId,
      approved,
      reason
    );

    res.json(result);
  } catch (error) {
    console.error('Error verifying student:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify student'
    });
  }
});

export default router; 