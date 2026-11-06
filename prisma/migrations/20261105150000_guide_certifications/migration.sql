-- AlterTable
ALTER TABLE "tour_packages" ADD COLUMN     "guideCertifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "photoRightsConfirmed" BOOLEAN NOT NULL DEFAULT false;

