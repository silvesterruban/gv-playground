import { Prisma } from '@prisma/client';

declare global {
  namespace Prisma {
    interface SchoolVerificationCreateInput {
      schoolId: string;
      studentId: string;
      verificationMethod: string;
      verificationEmail?: string | null;
      status?: string;
      rejectionReason?: string | null;
    }

    interface SchoolVerificationUpdateInput {
      schoolId?: string;
      studentId?: string;
      verificationMethod?: string;
      verificationEmail?: string | null;
      status?: string;
      rejectionReason?: string | null;
    }

    interface SchoolVerificationWhereInput {
      id?: string;
      schoolId?: string;
      studentId?: string;
      verificationMethod?: string;
      verificationEmail?: string | null;
      status?: string;
      rejectionReason?: string | null;
    }
  }
} 