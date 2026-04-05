-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new columns to Session
ALTER TABLE "Session" ADD COLUMN "modeId" TEXT NOT NULL DEFAULT 'meeting';
ALTER TABLE "Session" ADD COLUMN "isLive" BOOLEAN NOT NULL DEFAULT false;

-- Recreate Memory table with new schema (drop old, create new)
-- First drop existing foreign keys and indexes
DROP INDEX IF EXISTS "Memory_userId_type_idx";
DROP INDEX IF EXISTS "Memory_userId_name_idx";

-- Drop old Memory table and recreate with new schema
ALTER TABLE "Memory" DROP CONSTRAINT IF EXISTS "Memory_userId_fkey";
DROP TABLE "Memory";

CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Memory_userId_type_idx" ON "Memory"("userId", "type");

ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate WhisperCard table with new schema
ALTER TABLE "WhisperCard" DROP CONSTRAINT IF EXISTS "WhisperCard_sessionId_fkey";
DROP TABLE "WhisperCard";

CREATE TABLE "WhisperCard" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "detail" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "sourceMemoryId" TEXT,
    "sourceSessionId" TEXT,
    "ttl" INTEGER NOT NULL DEFAULT 8,
    "requiresAck" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhisperCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhisperCard_sessionId_idx" ON "WhisperCard"("sessionId");
CREATE INDEX "WhisperCard_userId_status_idx" ON "WhisperCard"("userId", "status");

ALTER TABLE "WhisperCard" ADD CONSTRAINT "WhisperCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhisperCard" ADD CONSTRAINT "WhisperCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create AngelMode table
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

-- Create Streak table
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

-- Create UserPreferences table
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
