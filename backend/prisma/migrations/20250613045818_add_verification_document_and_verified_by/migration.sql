-- AlterTable
ALTER TABLE "School" ADD COLUMN     "verificationMethods" TEXT[] DEFAULT ARRAY['email', 'id_card', 'transcript']::TEXT[];
