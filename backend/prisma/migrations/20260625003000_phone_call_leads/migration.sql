CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "serviceType" TEXT,
    "requestText" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web-form',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedProviderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Lead" (
    "id",
    "fullName",
    "phoneNumber",
    "email",
    "serviceType",
    "requestText",
    "city",
    "notes",
    "source",
    "status",
    "assignedProviderId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "fullName",
    "phoneNumber",
    "email",
    "serviceType",
    "requestText",
    "city",
    "notes",
    COALESCE("source", 'web-form'),
    "status",
    "assignedProviderId",
    "createdAt",
    "updatedAt"
FROM "Lead";

DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";

CREATE INDEX "Lead_serviceType_status_createdAt_idx" ON "Lead"("serviceType", "status", "createdAt");
CREATE INDEX "Lead_assignedProviderId_idx" ON "Lead"("assignedProviderId");
