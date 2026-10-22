-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "tour_packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "tourType" TEXT,
    "location" TEXT,
    "destinationSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "badge" TEXT,
    "summary" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "durationDays" INTEGER,
    "durationNights" INTEGER,
    "durationLabel" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "groupSize" TEXT NOT NULL DEFAULT '',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "freeCancellation" BOOLEAN NOT NULL DEFAULT false,
    "payLater" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "description" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "routeSummary" TEXT,
    "itinerary" JSONB NOT NULL DEFAULT '[]',
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notSuitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatToBring" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notAllowed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "knowBeforeYouGo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "reviewBreakdown" JSONB NOT NULL DEFAULT '[]',
    "aiReviewSummary" TEXT,
    "reviewHighlights" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "tourCount" INTEGER NOT NULL DEFAULT 0,
    "startingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "mapX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "mapY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "tourCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "countryFlag" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "avatarAlt" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "tourPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "category" TEXT NOT NULL DEFAULT '',
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_packages_slug_key" ON "tour_packages"("slug");

-- CreateIndex
CREATE INDEX "tour_packages_status_createdAt_idx" ON "tour_packages"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

-- CreateIndex
CREATE INDEX "destinations_status_idx" ON "destinations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_slug_key" ON "experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_status_idx" ON "experiences"("status");

-- CreateIndex
CREATE INDEX "testimonials_status_createdAt_idx" ON "testimonials"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_publishedAt_idx" ON "blog_posts"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_tourPackageId_fkey" FOREIGN KEY ("tourPackageId") REFERENCES "tour_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
