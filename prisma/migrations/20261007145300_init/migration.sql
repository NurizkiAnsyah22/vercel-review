-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('UNACTIVATED', 'PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InteractionSource" AS ENUM ('QR', 'NFC', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AssignmentAction" AS ENUM ('ACTIVATED', 'REACTIVATED', 'RESET', 'REASSIGNED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MonitoringJobStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewCheckResult" AS ENUM ('NO_CHANGE', 'INCREASED', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REVIEW_INCREASED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "whatsappNumber" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "whatsappNumber" VARCHAR(32) NOT NULL,
    "googleMapsUrl" TEXT,
    "placeId" VARCHAR(64),
    "googleReviewUrl" TEXT,
    "googleRating" DECIMAL(2,1),
    "googleReviewCount" INTEGER,
    "lastKnownReviewCount" INTEGER,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "publicToken" VARCHAR(32) NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'UNACTIVATED',
    "businessId" UUID,
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_assignments" (
    "id" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "action" "AssignmentAction" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "card_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "businessId" UUID,
    "source" "InteractionSource" NOT NULL DEFAULT 'UNKNOWN',
    "ipHash" VARCHAR(64),
    "userAgentHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_jobs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "status" "MonitoringJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "baselineReviewCount" INTEGER,
    "startedFromInteractionId" UUID,
    "nextCheckAt" TIMESTAMP(3),
    "checksPerformed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "activeKey" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_checks" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewCountBefore" INTEGER,
    "reviewCountAfter" INTEGER,
    "delta" INTEGER,
    "result" "ReviewCheckResult" NOT NULL,
    "source" VARCHAR(32) NOT NULL DEFAULT 'PLACES_API',
    "errorMessage" TEXT,

    CONSTRAINT "review_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'REVIEW_INCREASED',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "recipient" VARCHAR(32) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" VARCHAR(128),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "key" VARCHAR(64) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "businesses_placeId_idx" ON "businesses"("placeId");

-- CreateIndex
CREATE INDEX "businesses_ownerId_idx" ON "businesses"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_code_key" ON "cards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cards_publicToken_key" ON "cards"("publicToken");

-- CreateIndex
CREATE INDEX "cards_status_idx" ON "cards"("status");

-- CreateIndex
CREATE INDEX "cards_businessId_idx" ON "cards"("businessId");

-- CreateIndex
CREATE INDEX "card_assignments_cardId_idx" ON "card_assignments"("cardId");

-- CreateIndex
CREATE INDEX "card_assignments_businessId_idx" ON "card_assignments"("businessId");

-- CreateIndex
CREATE INDEX "interactions_cardId_idx" ON "interactions"("cardId");

-- CreateIndex
CREATE INDEX "interactions_businessId_idx" ON "interactions"("businessId");

-- CreateIndex
CREATE INDEX "interactions_createdAt_idx" ON "interactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_jobs_activeKey_key" ON "monitoring_jobs"("activeKey");

-- CreateIndex
CREATE INDEX "monitoring_jobs_businessId_idx" ON "monitoring_jobs"("businessId");

-- CreateIndex
CREATE INDEX "monitoring_jobs_status_idx" ON "monitoring_jobs"("status");

-- CreateIndex
CREATE INDEX "monitoring_jobs_nextCheckAt_idx" ON "monitoring_jobs"("nextCheckAt");

-- CreateIndex
CREATE INDEX "review_checks_jobId_idx" ON "review_checks"("jobId");

-- CreateIndex
CREATE INDEX "review_checks_checkedAt_idx" ON "review_checks"("checkedAt");

-- CreateIndex
CREATE INDEX "notifications_businessId_idx" ON "notifications"("businessId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_assignments" ADD CONSTRAINT "card_assignments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_assignments" ADD CONSTRAINT "card_assignments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_startedFromInteractionId_fkey" FOREIGN KEY ("startedFromInteractionId") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "monitoring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
