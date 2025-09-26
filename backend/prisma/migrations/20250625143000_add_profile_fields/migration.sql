-- CreateTable
-- Migration: 20250625143000_add_profile_fields

-- Add new profile fields to students table
ALTER TABLE "students" ADD COLUMN "gpa" DECIMAL(3,2);
ALTER TABLE "students" ADD COLUMN "achievements" TEXT;
ALTER TABLE "students" ADD COLUMN "financial_need" TEXT;
ALTER TABLE "students" ADD COLUMN "phone_number" VARCHAR(20);
ALTER TABLE "students" ADD COLUMN "linkedin_url" TEXT;
ALTER TABLE "students" ADD COLUMN "personal_statement" TEXT;

-- Add constraints for GPA (0.0 to 4.0)
ALTER TABLE "students" ADD CONSTRAINT "students_gpa_check" CHECK ("gpa" >= 0.0 AND "gpa" <= 4.0);

-- Add index for phone number for potential lookups
CREATE INDEX "students_phone_number_idx" ON "students"("phone_number");

-- Add index for LinkedIn URL for potential lookups
CREATE INDEX "students_linkedin_url_idx" ON "students"("linkedin_url");