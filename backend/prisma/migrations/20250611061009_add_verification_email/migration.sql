/*
  Warnings:

  - You are about to drop the column `isPublic` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `school_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schools` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `welcome_boxes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_donorId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_donorId_fkey";

-- DropForeignKey
ALTER TABLE "school_verifications" DROP CONSTRAINT "school_verifications_school_id_fkey";

-- DropForeignKey
ALTER TABLE "school_verifications" DROP CONSTRAINT "school_verifications_student_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_schoolRelationId_fkey";

-- DropForeignKey
ALTER TABLE "welcome_boxes" DROP CONSTRAINT "welcome_boxes_student_id_fkey";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "isPublic";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "PaymentMethod";

-- DropTable
DROP TABLE "school_verifications";

-- DropTable
DROP TABLE "schools";

-- DropTable
DROP TABLE "welcome_boxes";

-- CreateTable
CREATE TABLE "WelcomeBox" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trackingNumber" TEXT,
    "shippingAddress" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolVerification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "verificationEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeBox_studentId_key" ON "WelcomeBox"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolVerification_studentId_key" ON "SchoolVerification"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_domain_key" ON "School"("domain");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolRelationId_fkey" FOREIGN KEY ("schoolRelationId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelcomeBox" ADD CONSTRAINT "WelcomeBox_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolVerification" ADD CONSTRAINT "SchoolVerification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolVerification" ADD CONSTRAINT "SchoolVerification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
