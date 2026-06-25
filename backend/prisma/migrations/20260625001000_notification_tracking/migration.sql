ALTER TABLE "LeadAssignment" ADD COLUMN "notificationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LeadAssignment" ADD COLUMN "notificationError" TEXT;
ALTER TABLE "LeadAssignment" ADD COLUMN "notificationAttemptedAt" DATETIME;
ALTER TABLE "LeadAssignment" ADD COLUMN "notifiedAt" DATETIME;

CREATE INDEX "LeadAssignment_notificationStatus_notificationAttemptedAt_idx"
ON "LeadAssignment"("notificationStatus", "notificationAttemptedAt");
