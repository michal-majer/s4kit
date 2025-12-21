-- Secure logging migration: Remove body columns, add metadata fields
-- This migration converts the request_logs table from storing sensitive body content
-- to storing only metadata for enterprise-ready security compliance.

-- Step 1: Drop columns that store sensitive body content
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "request_body";
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "response_body";
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "request_headers";
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "response_headers";

-- Step 2: Add new metadata columns

-- Entity context
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "entity" varchar(100);
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "operation" varchar(20);

-- Success indicator
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "success" boolean NOT NULL DEFAULT true;

-- Size metrics (instead of body content)
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "request_size" integer;
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "response_size" integer;
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "record_count" integer;

-- Structured error handling
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "error_code" varchar(50);
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "error_category" varchar(20);

-- Audit trail
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "request_id" varchar(36);
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "client_ip_hash" varchar(64);
ALTER TABLE "request_logs" ADD COLUMN IF NOT EXISTS "user_agent" varchar(255);

-- Step 3: Shorten error_message column (was 2000, now 500)
-- First, truncate any existing long messages
UPDATE "request_logs" SET "error_message" = LEFT("error_message", 500) WHERE LENGTH("error_message") > 500;
-- Then alter the column
ALTER TABLE "request_logs" ALTER COLUMN "error_message" TYPE varchar(500);

-- Step 4: Create indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_request_logs_entity" ON "request_logs" ("entity");
CREATE INDEX IF NOT EXISTS "idx_request_logs_success" ON "request_logs" ("success");
CREATE INDEX IF NOT EXISTS "idx_request_logs_created_at" ON "request_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_request_logs_error_category" ON "request_logs" ("error_category") WHERE "error_category" IS NOT NULL;

-- Step 5: Backfill success column for existing records based on status_code
UPDATE "request_logs" SET "success" = ("status_code" >= 200 AND "status_code" < 400) WHERE "success" IS NULL;
