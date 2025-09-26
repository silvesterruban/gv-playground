/*
  Warnings:

  - A unique constraint covering the columns `[email,userType]` on the table `email_otps` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "email_otps_email_userType_key" ON "email_otps"("email", "userType");
