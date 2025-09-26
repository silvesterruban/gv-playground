-- AlterTable
ALTER TABLE "SchoolVerification" ADD COLUMN     "verification_document" TEXT,
ADD COLUMN     "verified_by" TEXT;

-- AddForeignKey
ALTER TABLE "SchoolVerification" ADD CONSTRAINT "SchoolVerification_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
