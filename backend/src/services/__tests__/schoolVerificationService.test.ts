import { PrismaClient } from '@prisma/client';
import { SchoolVerificationService } from '../schoolVerificationService';
import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';

// Mock AWS services
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ses');

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    student: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    school: {
      findUnique: jest.fn()
    },
    schoolVerification: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    }
  }))
}));

describe('SchoolVerificationService', () => {
  let prisma: jest.Mocked<PrismaClient>;
  const mockStudent = {
    id: 'test-student-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'Student'
  };

  const mockSchool = {
    id: 'test-school-id',
    name: 'Test University',
    domain: 'test.edu',
    verificationMethods: ['email', 'id_card', 'transcript']
  };

  const mockVerificationData = {
    studentId: 'test-student-id',
    schoolId: 'test-school-id',
    studentIdNumber: '12345',
    verificationMethod: 'email' as const,
    verificationEmail: 'test@school.edu'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      student: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      school: {
        findUnique: jest.fn()
      },
      schoolVerification: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      }
    } as any;
    (PrismaClient as jest.Mock).mockImplementation(() => prisma);
  });

  describe('submitVerification', () => {
    it('should submit verification successfully', async () => {
      const mockVerificationData = {
        studentId: 'test-student-id',
        schoolId: 'test-school-id',
        verificationMethod: 'email' as const,
        verificationEmail: 'test@school.edu',
        studentIdNumber: '12345'
      };
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-student-id',
        email: 'test@example.com'
      });
      (prisma.school.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-school-id',
        verificationMethods: ['email', 'transcript']
      });
      (prisma.schoolVerification.upsert as jest.Mock).mockResolvedValue({
        id: 'verification-1',
        ...mockVerificationData,
        status: 'pending'
      });
      const result = await SchoolVerificationService.submitVerification(mockVerificationData);
      expect(result).toEqual({
        success: true,
        message: 'Verification request submitted successfully',
        verification: {
          id: 'verification-1',
          ...mockVerificationData,
          status: 'pending'
        }
      });
    });

    it('should throw error if school not found', async () => {
      const mockVerificationData = {
        studentId: 'test-student-id',
        schoolId: 'non-existent',
        verificationMethod: 'email' as const,
        verificationEmail: 'test@school.edu',
        studentIdNumber: '12345'
      };
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-student-id',
        email: 'test@example.com'
      });
      (prisma.school.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(SchoolVerificationService.submitVerification(mockVerificationData))
        .rejects.toThrow('School not found');
    });

    it('should throw error if verification method not supported', async () => {
      const mockVerificationData = {
        studentId: 'test-student-id',
        schoolId: 'test-school-id',
        verificationMethod: 'id_card' as const,
        verificationEmail: undefined,
        studentIdNumber: '12345'
      };
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-student-id',
        email: 'test@example.com'
      });
      (prisma.school.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-school-id',
        verificationMethods: ['email', 'transcript']
      });
      await expect(SchoolVerificationService.submitVerification(mockVerificationData))
        .rejects.toThrow('Verification method not supported by school');
    });
  });

  describe('verifyStudent', () => {
    it('should verify student successfully', async () => {
      const verificationId = 'verification-1';
      const adminId = 'admin-1';
      const approved = true;
      (prisma.schoolVerification.findUnique as jest.Mock).mockResolvedValue({
        id: verificationId,
        status: 'pending',
        studentId: 'test-student-id',
        student: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'Student'
        }
      });
      (prisma.schoolVerification.update as jest.Mock).mockResolvedValue({
        id: verificationId,
        status: 'verified',
        studentId: 'test-student-id'
      });
      const result = await SchoolVerificationService.verifyStudent(verificationId, adminId, approved);
      expect(result).toEqual({
        success: true,
        message: 'Verification approved successfully',
        verification: {
          id: verificationId,
          status: 'verified',
          studentId: 'test-student-id'
        }
      });
    });

    it('should throw error if verification request not found', async () => {
      const verificationId = 'non-existent';
      const adminId = 'admin-1';
      const approved = true;
      (prisma.schoolVerification.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(SchoolVerificationService.verifyStudent(verificationId, adminId, approved))
        .rejects.toThrow('Verification request not found');
    });
  });
}); 