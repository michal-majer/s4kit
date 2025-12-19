-- Migration: Systems Entity Refactor
-- Drop old tables and create new schema

-- Drop old tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "api_key_access" CASCADE;
DROP TABLE IF EXISTS "request_logs" CASCADE;
DROP TABLE IF EXISTS "api_keys" CASCADE;
DROP TABLE IF EXISTS "connection_services" CASCADE;
DROP TABLE IF EXISTS "services" CASCADE;
DROP TABLE IF EXISTS "connections" CASCADE;

-- Drop old enum if exists
DROP TYPE IF EXISTS "environment";

-- Create new enums
CREATE TYPE "system_type" AS ENUM('s4_public', 's4_private', 'btp', 'other');
CREATE TYPE "instance_environment" AS ENUM('dev', 'quality', 'production');

-- Note: auth_type enum already exists, keeping it

-- Create systems table (replaces connections)
CREATE TABLE IF NOT EXISTS "systems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "type" "system_type" NOT NULL,
  "description" varchar(1000),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create instances table
CREATE TABLE IF NOT EXISTS "instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_id" uuid NOT NULL REFERENCES "systems"("id") ON DELETE CASCADE,
  "environment" "instance_environment" NOT NULL,
  "base_url" varchar(500) NOT NULL,
  "auth_type" "auth_type" DEFAULT 'basic' NOT NULL,
  "username" varchar(255),
  "password" varchar(500),
  "auth_config" jsonb,
  "credentials" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "instances_system_id_environment_unique" UNIQUE("system_id", "environment")
);

-- Create predefined_services table (seed table)
CREATE TABLE IF NOT EXISTS "predefined_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_type" "system_type" NOT NULL,
  "name" varchar(255) NOT NULL,
  "alias" varchar(50) NOT NULL,
  "service_path" varchar(500) NOT NULL,
  "description" varchar(1000),
  "default_entities" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create system_services table (replaces services)
CREATE TABLE IF NOT EXISTS "system_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_id" uuid NOT NULL REFERENCES "systems"("id") ON DELETE CASCADE,
  "predefined_service_id" uuid REFERENCES "predefined_services"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "alias" varchar(50) NOT NULL,
  "service_path" varchar(500) NOT NULL,
  "description" varchar(1000),
  "entities" jsonb DEFAULT '[]',
  "auth_type" "auth_type",
  "username" varchar(255),
  "password" varchar(500),
  "auth_config" jsonb,
  "credentials" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "system_services_system_id_alias_unique" UNIQUE("system_id", "alias")
);

-- Create instance_services table (replaces connection_services)
CREATE TABLE IF NOT EXISTS "instance_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instance_id" uuid NOT NULL REFERENCES "instances"("id") ON DELETE CASCADE,
  "system_service_id" uuid NOT NULL REFERENCES "system_services"("id") ON DELETE CASCADE,
  "service_path_override" varchar(500),
  "auth_type" "auth_type",
  "username" varchar(255),
  "password" varchar(500),
  "auth_config" jsonb,
  "credentials" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "instance_services_instance_id_system_service_id_unique" UNIQUE("instance_id", "system_service_id")
);

-- Recreate api_keys table (without environment field - now determined by instance)
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "key_hash" varchar(64) NOT NULL UNIQUE,
  "key_prefix" varchar(24) NOT NULL,
  "key_last_4" varchar(4) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(1000),
  "rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
  "rate_limit_per_day" integer DEFAULT 10000 NOT NULL,
  "expires_at" timestamp,
  "revoked" boolean DEFAULT false NOT NULL,
  "revoked_at" timestamp,
  "revoked_reason" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" varchar(255),
  "last_used_at" timestamp,
  "last_used_ip" varchar(45),
  "usage_count" integer DEFAULT 0 NOT NULL
);

-- Create api_key_access table with new FK
CREATE TABLE IF NOT EXISTS "api_key_access" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "instance_service_id" uuid NOT NULL REFERENCES "instance_services"("id") ON DELETE CASCADE,
  "permissions" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_key_access_api_key_id_instance_service_id_unique" UNIQUE("api_key_id", "instance_service_id")
);

-- Recreate request_logs table
CREATE TABLE IF NOT EXISTS "request_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "method" varchar(10) NOT NULL,
  "path" varchar(500) NOT NULL,
  "status_code" integer NOT NULL,
  "response_time" integer,
  "sap_response_time" integer,
  "request_body" jsonb,
  "response_body" jsonb,
  "request_headers" jsonb,
  "response_headers" jsonb,
  "error_message" varchar(2000),
  "created_at" timestamp DEFAULT now() NOT NULL
);
