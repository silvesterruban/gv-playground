-- AlterTable
ALTER TABLE "students" ADD COLUMN     "paymentComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "registrationFee" DOUBLE PRECISION DEFAULT 25.00;
