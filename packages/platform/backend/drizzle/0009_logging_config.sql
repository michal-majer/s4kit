-- Add logging configuration fields

-- Step 1: Create log_level enum
DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('minimal', 'standard', 'extended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add logging configuration to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_log_level" log_level NOT NULL DEFAULT 'standard';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "log_retention_days" integer NOT NULL DEFAULT 90;

-- Step 3: Add logging configuration to api_keys
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "log_level" log_level;
