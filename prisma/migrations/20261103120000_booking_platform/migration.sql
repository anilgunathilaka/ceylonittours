-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "answers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "optionId" TEXT,
ADD COLUMN     "optionTitle" TEXT,
ADD COLUMN     "participants" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'pay_on_arrival',
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "totalParticipants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "tour_packages" ADD COLUMN     "bookingQuestions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "cancellationNotes" TEXT,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "gallery" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "meetingInstructions" TEXT,
ADD COLUMN     "meetingLat" DOUBLE PRECISION,
ADD COLUMN     "meetingLng" DOUBLE PRECISION,
ADD COLUMN     "meetingPointAddress" TEXT,
ADD COLUMN     "meetingPointName" TEXT,
ADD COLUMN     "meetingType" TEXT,
ADD COLUMN     "pickupAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "tour_options" (
    "id" TEXT NOT NULL,
    "packageSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationLabel" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pickupIncluded" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "pricingMode" TEXT NOT NULL DEFAULT 'per_person',
    "prices" JSONB NOT NULL DEFAULT '[]',
    "groupTiers" JSONB NOT NULL DEFAULT '[]',
    "seasons" JSONB NOT NULL DEFAULT '[]',
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "maxParticipants" INTEGER,
    "cutoffHours" INTEGER NOT NULL DEFAULT 24,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "weekdays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
    "startTimes" TEXT[],
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageSlug" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_options_packageSlug_sortOrder_idx" ON "tour_options"("packageSlug", "sortOrder");

-- CreateIndex
CREATE INDEX "availability_rules_optionId_idx" ON "availability_rules"("optionId");

-- CreateIndex
CREATE INDEX "availability_blocks_optionId_date_idx" ON "availability_blocks"("optionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_packageSlug_status_createdAt_idx" ON "reviews"("packageSlug", "status", "createdAt");

-- CreateIndex
CREATE INDEX "bookings_optionId_travelDate_startTime_idx" ON "bookings"("optionId", "travelDate", "startTime");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "tour_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "tour_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "tour_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

