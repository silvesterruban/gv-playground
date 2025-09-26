import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireVerifiedStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }

    if (!student.schoolVerified || !student.studentIdVerified) {
      return res.status(403).json({
        success: false,
        message: 'School verification required'
      });
    }

    next();
  } catch (error) {
    console.error('Student middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify student status'
    });
  }
}; 