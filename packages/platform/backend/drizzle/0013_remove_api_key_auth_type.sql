-- Migration: Remove api_key auth type (consolidate with custom)
-- Any existing api_key configurations will be migrated to custom type

-- Step 1: Migrate existing api_key records to custom type
-- Convert credentials.apiKey to credentials.headerValue
-- Preserve authConfig.headerName (or set default 'X-API-Key')
UPDATE auth_configurations
SET
  auth_type = 'custom',
  credentials = CASE
    WHEN credentials IS NOT NULL AND credentials->>'apiKey' IS NOT NULL
    THEN jsonb_build_object('headerValue', credentials->>'apiKey')
    ELSE credentials
  END,
  auth_config = CASE
    WHEN auth_config IS NULL OR auth_config->>'headerName' IS NULL
    THEN jsonb_build_object('headerName', 'X-API-Key')
    ELSE auth_config
  END,
  updated_at = NOW()
WHERE auth_type = 'api_key';

-- Step 2: Remove api_key from the enum
-- PostgreSQL doesn't support DROP VALUE from enums, so we need to recreate the type
-- This is a safe operation since we've already migrated all api_key records

-- Create new enum without api_key
CREATE TYPE auth_type_new AS ENUM ('none', 'basic', 'oauth2', 'custom');

-- Update the column to use the new type
ALTER TABLE auth_configurations
  ALTER COLUMN auth_type TYPE auth_type_new
  USING auth_type::text::auth_type_new;

-- Drop old type and rename new one
DROP TYPE auth_type;
ALTER TYPE auth_type_new RENAME TO auth_type;
