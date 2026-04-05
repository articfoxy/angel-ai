-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new columns to Session
ALTER TABLE "Session" ADD COLUMN "modeId" TEXT NOT NULL DEFAULT 'meeting';
ALTER TABLE "Session" ADD COLUMN "isLive" BOOLEAN NOT NULL DEFAULT false;

-- Alter Memory table: add new columns, transform existing ones
-- Add title column (copy from name initially)
ALTER TABLE "Memory" ADD COLUMN "title" TEXT;
UPDATE "Memory" SET "title" = "name";
ALTER TABLE "Memory" ALTER COLUMN "title" SET NOT NULL;

-- Add content_text column, migrate content from JSONB to TEXT
ALTER TABLE "Memory" ADD COLUMN "content_text" TEXT;
UPDATE "Memory" SET "content_text" = "content"::TEXT;
ALTER TABLE "Memory" ALTER COLUMN "content_text" SET NOT NULL;
ALTER TABLE "Memory" DROP COLUMN "content";
ALTER TABLE "Memory" RENAME COLUMN "content_text" TO "content";

-- Add new Memory columns
ALTER TABLE "Memory" ADD COLUMN "embedding" JSONB;
ALTER TABLE "Memory" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Memory" ADD COLUMN "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Memory" ADD COLUMN "accessCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Memory" ADD COLUMN "lastAccessed" TIMESTAMP(3);
ALTER TABLE "Memory" ADD COLUMN "sessionId" TEXT;

-- Add foreign key for Memory -> Session
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new columns to WhisperCard
ALTER TABLE "WhisperCard" ADD COLUMN "userId" TEXT;
ALTER TABLE "WhisperCard" ADD COLUMN "detail" TEXT;
ALTER TABLE "WhisperCard" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "WhisperCard" ADD COLUMN "sourceMemoryId" TEXT;
ALTER TABLE "WhisperCard" ADD COLUMN "sourceSessionId" TEXT;
ALTER TABLE "WhisperCard" ADD COLUMN "ttl" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "WhisperCard" ADD COLUMN "requiresAck" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WhisperCard" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'delivered';
ALTER TABLE "WhisperCard" ADD COLUMN "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WhisperCard" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);

-- Set userId on existing WhisperCards from their session's userId
UPDATE "WhisperCard" wc SET "userId" = s."userId"
FROM "Session" s WHERE wc."sessionId" = s."id";

-- Add foreign key for WhisperCard -> User (after setting values)
ALTER TABLE "WhisperCard" ADD CONSTRAINT "WhisperCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for WhisperCard
CREATE INDEX "WhisperCard_sessionId_idx" ON "WhisperCard"("sessionId");
CREATE INDEX "WhisperCard_userId_status_idx" ON "WhisperCard"("userId", "status");

-- CreateTable AngelMode
CREATE TABLE "AngelMode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modeId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AngelMode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelMode_userId_modeId_key" ON "AngelMode"("userId", "modeId");
ALTER TABLE "AngelMode" ADD CONSTRAINT "AngelMode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Streak
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable UserPreferences
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whisperFrequency" TEXT NOT NULL DEFAULT 'active',
    "digestTime" TEXT NOT NULL DEFAULT '20:00',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultMode" TEXT NOT NULL DEFAULT 'meeting',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
