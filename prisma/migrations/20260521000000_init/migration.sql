-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telegramMessageId" BIGINT NOT NULL,
    "mediaGroupId" TEXT,
    "caption" TEXT,
    "contributorUsername" TEXT,
    "contributorDisplayName" TEXT,
    "locationId" TEXT,
    "reactions" JSONB,
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "dominantColor" TEXT,
    "aspectRatio" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "aspectRatio" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "blurHash" TEXT NOT NULL,
    "blurDataURL" TEXT NOT NULL,
    "dominantColor" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "MoodTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMood" (
    "postId" TEXT NOT NULL,
    "moodId" TEXT NOT NULL,

    CONSTRAINT "PostMood_pkey" PRIMARY KEY ("postId","moodId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_telegramMessageId_key" ON "Post"("telegramMessageId");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Post_contributorUsername_idx" ON "Post"("contributorUsername");

-- CreateIndex
CREATE INDEX "Post_locationId_idx" ON "Post"("locationId");

-- CreateIndex
CREATE INDEX "Post_mediaGroupId_idx" ON "Post"("mediaGroupId");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Media_postId_orderIndex_idx" ON "Media"("postId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MoodTag_slug_key" ON "MoodTag"("slug");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMood" ADD CONSTRAINT "PostMood_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMood" ADD CONSTRAINT "PostMood_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "MoodTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

