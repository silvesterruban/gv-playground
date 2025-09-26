import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/emailService';

export class AdminController {
  // Get all students with filtering and pagination
  static async getStudents(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        status,
        schoolName,
        graduationYear,
        verificationStatus,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        AND: []
      };

      if (status) where.AND.push({ status });
      if (schoolName) where.AND.push({ schoolName });
      if (graduationYear) where.AND.push({ graduationYear });
      if (verificationStatus) where.AND.push({ verificationStatus });

      // Remove empty AND array
      if (where.AND.length === 0) delete where.AND;

      // Build order by clause
      const orderBy: any = {
        [sortBy]: sortOrder
      };

      // Execute queries
      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          orderBy,
          skip: offset,
          take: Number(limit),
          include: {
            schoolVerification: true,
            welcomeBox: true
          }
        }),
        prisma.student.count({ where })
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          students,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }
  }

  // Get student details
  static async getStudentDetails(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const { studentId } = req.params;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          schoolVerification: true,
          welcomeBox: true,
          donations: {
            include: {
              donor: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          registries: true
        }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found'
        });
        return;
      }

      res.json({
        success: true,
        data: student
      });

    } catch (error) {
      console.error('Error fetching student details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student details'
      });
    }
  }

  // Update student status
  static async updateStudentStatus(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const { studentId } = req.params;
      const { status, reason } = req.body;

      const student = await prisma.student.update({
        where: { id: studentId },
        data: { /* Remove status field if it doesn't exist */ },
        include: { schoolVerification: true }
      });

      // Send email notification
      if (student.email) {
        await sendEmail({
          to: student.email,
          subject: 'Account Status Update',
          text: `Your account status has been updated. ${reason ? `Reason: ${reason}` : ''}`,
          html: `
            <h1>Account Status Update</h1>
            <p>Your account status has been updated.</p>
            ${reason ? `<p>Reason: ${reason}</p>` : ''}
          `
        });
      }

      res.json({
        success: true,
        data: student
      });

    } catch (error) {
      console.error('Error updating student status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update student status'
      });
    }
  }

  // Review school verification
  static async reviewSchoolVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { verificationId, status, rejectionReason } = req.body;
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
      }

      const verification = await prisma.schoolVerification.update({
        where: { id: verificationId },
        data: {
          status,
          rejectionReason,
        },
      });

      if (verification.verificationEmail) {
        await sendEmail({
          to: verification.verificationEmail,
          subject: 'School Verification Update',
          text: `Your school verification has been ${status}. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
        });
      }

      return res.json({
        success: true,
        message: 'School verification reviewed successfully',
        data: { verification },
      });
    } catch (error) {
      console.error('Error reviewing school verification:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get pending verifications
  static async getPendingVerifications(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      const [verifications, total] = await Promise.all([
        prisma.schoolVerification.findMany({
          where: {
            status: 'pending'
          },
          orderBy: {
            [sortBy]: sortOrder
          },
          skip: offset,
          take: Number(limit),
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                schoolName: true,
                graduationYear: true
              }
            }
          }
        }),
        prisma.schoolVerification.count({
          where: {
            status: 'pending'
          }
        })
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          verifications,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending verifications'
      });
    }
  }

  // Get platform analytics
  static async getPlatformAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      // Get basic platform statistics
      const [totalStudents, totalDonations, totalAmount] = await Promise.all([
        prisma.student.count(),
        prisma.donation.count({ where: { status: 'completed' } }),
        prisma.donation.aggregate({
          where: { status: 'completed' },
          _sum: { amount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalStudents,
          totalDonations,
          totalAmount: totalAmount._sum.amount || 0
        }
      });
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform analytics'
      });
    }
  }


}