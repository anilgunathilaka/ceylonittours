-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discountPercent" DOUBLE PRECISION,
ADD COLUMN     "offerName" TEXT,
ADD COLUMN     "pickupLocation" TEXT,
ADD COLUMN     "pickupTime" TEXT;

-- AlterTable
ALTER TABLE "tour_options" ADD COLUMN     "guideMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "instantConfirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMinuteAfterFirst" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupArea" TEXT,
ADD COLUMN     "pickupConfirmation" TEXT,
ADD COLUMN     "pickupLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pickupMinutesBefore" INTEGER,
ADD COLUMN     "pickupMode" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "pickupTiming" TEXT,
ADD COLUMN     "skipTheLine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slotCutoffs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tour_packages" ADD COLUMN     "foodDetails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "foodIncluded" TEXT,
ADD COLUMN     "guideType" TEXT,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "petFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "petPolicy" TEXT,
ADD COLUMN     "transportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "booking_messages" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_offers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "packageSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "days" INTEGER,
    "travelFrom" DATE,
    "travelTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_views" (
    "packageSlug" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_views_pkey" PRIMARY KEY ("packageSlug","day")
);

-- CreateIndex
CREATE INDEX "booking_messages_bookingId_createdAt_idx" ON "booking_messages"("bookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

