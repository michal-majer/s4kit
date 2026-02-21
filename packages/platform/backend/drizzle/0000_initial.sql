-- S4Kit Initial Schema
-- Merged from migrations 0000-0013

-- Enums
CREATE TYPE "public"."system_type" AS ENUM('s4_public', 's4_private', 's4_onprem', 'btp', 'other');
CREATE TYPE "public"."instance_environment" AS ENUM('sandbox', 'dev', 'quality', 'preprod', 'production');
CREATE TYPE "public"."auth_type" AS ENUM('none', 'basic', 'oauth2', 'custom');
CREATE TYPE "public"."log_level" AS ENUM('minimal', 'standard', 'extended');
CREATE TYPE "public"."odata_version" AS ENUM('v2', 'v4');
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'failed');
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'developer');
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'pro', 'enterprise');

-- Organizations
CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "onboarding_completed_at" timestamp,
  "onboarding_data" jsonb,
  "default_log_level" "log_level" NOT NULL DEFAULT 'standard',
  "log_retention_days" integer NOT NULL DEFAULT 90,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Auth Configurations (reusable auth configs shared across instances/services)
CREATE TABLE "auth_configurations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" varchar(500),
  "auth_type" "auth_type" DEFAULT 'basic' NOT NULL,
  "username" varchar(255),
  "password" varchar(500),
  "auth_config" jsonb,
  "credentials" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "auth_configurations_organization_id_name_unique" UNIQUE("organization_id", "name")
);

-- Systems
CREATE TABLE "systems" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "type" "system_type" NOT NULL,
  "description" varchar(1000),
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Instances (each system can have multiple: sandbox, dev, quality, preprod, production)
CREATE TABLE "instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_id" uuid NOT NULL REFERENCES "systems"("id") ON DELETE CASCADE,
  "environment" "instance_environment" NOT NULL,
  "base_url" varchar(500) NOT NULL,
  "auth_config_id" uuid REFERENCES "auth_configurations"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "instances_system_id_environment_unique" UNIQUE("system_id", "environment")
);

-- Predefined Services (seed table for SAP APIs)
CREATE TABLE "predefined_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_type" "system_type" NOT NULL,
  "name" varchar(255) NOT NULL,
  "alias" varchar(50) NOT NULL,
  "service_path" varchar(500) NOT NULL,
  "description" varchar(1000),
  "default_entities" jsonb DEFAULT '[]',
  "deprecated" boolean DEFAULT false NOT NULL,
  "odata_version" "odata_version" DEFAULT 'v2' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "predefined_services_system_type_alias_unique" UNIQUE("system_type", "alias")
);

-- System Services (services available on a system)
CREATE TABLE "system_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "system_id" uuid NOT NULL REFERENCES "systems"("id") ON DELETE CASCADE,
  "predefined_service_id" uuid REFERENCES "predefined_services"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "alias" varchar(50) NOT NULL,
  "service_path" varchar(500) NOT NULL,
  "description" varchar(1000),
  "entities" jsonb DEFAULT '[]',
  "odata_version" "odata_version",
  "auth_config_id" uuid REFERENCES "auth_configurations"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "system_services_system_id_alias_unique" UNIQUE("system_id", "alias")
);

-- Instance Services (links services to specific instances)
CREATE TABLE "instance_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instance_id" uuid NOT NULL REFERENCES "instances"("id") ON DELETE CASCADE,
  "system_service_id" uuid NOT NULL REFERENCES "system_services"("id") ON DELETE CASCADE,
  "service_path_override" varchar(500),
  "entities" jsonb,
  "auth_config_id" uuid REFERENCES "auth_configurations"("id") ON DELETE SET NULL,
  "verification_status" "verification_status",
  "last_verified_at" timestamp,
  "verification_error" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "instance_services_instance_id_system_service_id_unique" UNIQUE("instance_id", "system_service_id")
);

-- API Keys (Stripe-like secure key management)
CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "key_hash" varchar(64) NOT NULL UNIQUE,
  "key_prefix" varchar(24) NOT NULL,
  "key_last_4" varchar(4) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(1000),
  "rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
  "rate_limit_per_day" integer DEFAULT 10000 NOT NULL,
  "log_level" "log_level",
  "expires_at" timestamp,
  "revoked" boolean DEFAULT false NOT NULL,
  "revoked_at" timestamp,
  "revoked_reason" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" text,
  "last_used_at" timestamp,
  "usage_count" integer DEFAULT 0 NOT NULL
);

-- API Key Access (links API key to instance+service with permissions)
CREATE TABLE "api_key_access" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "instance_service_id" uuid NOT NULL REFERENCES "instance_services"("id") ON DELETE CASCADE,
  "permissions" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_key_access_api_key_id_instance_service_id_unique" UNIQUE("api_key_id", "instance_service_id")
);

-- Request Logs (secure metadata-only logging)
CREATE TABLE "request_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "system_id" uuid REFERENCES "systems"("id") ON DELETE SET NULL,
  "instance_id" uuid REFERENCES "instances"("id") ON DELETE SET NULL,
  "instance_service_id" uuid REFERENCES "instance_services"("id") ON DELETE SET NULL,
  "method" varchar(10) NOT NULL,
  "path" varchar(500) NOT NULL,
  "entity" varchar(100),
  "operation" varchar(20),
  "status_code" integer NOT NULL,
  "success" boolean DEFAULT true NOT NULL,
  "response_time" integer,
  "sap_response_time" integer,
  "request_size" integer,
  "response_size" integer,
  "record_count" integer,
  "error_code" varchar(50),
  "error_category" varchar(20),
  "error_message" varchar(500),
  "request_id" varchar(36),
  "client_ip_hash" varchar(64),
  "user_agent" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Users (better-auth core)
CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Sessions (better-auth core)
CREATE TABLE "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "active_organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Accounts (OAuth providers + credential auth)
CREATE TABLE "accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" varchar(255) NOT NULL,
  "provider_id" varchar(255) NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" varchar(500),
  "id_token" text,
  "password" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Verifications (email verification, password reset)
CREATE TABLE "verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" varchar(255) NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Organization Members (better-auth organization plugin)
CREATE TABLE "members" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "user_role" DEFAULT 'developer' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "members_organization_id_user_id_unique" UNIQUE("organization_id", "user_id")
);

CREATE INDEX "members_user_id_idx" ON "members" ("user_id");

-- Organization Invitations
CREATE TABLE "invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "role" "user_role" DEFAULT 'developer' NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "inviter_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Subscriptions (SaaS mode)
CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE UNIQUE,
  "stripe_customer_id" varchar(255),
  "stripe_subscription_id" varchar(255),
  "plan" "subscription_plan" DEFAULT 'free' NOT NULL,
  "status" "subscription_status" DEFAULT 'active' NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for request_logs
CREATE INDEX "idx_request_logs_entity" ON "request_logs" ("entity");
CREATE INDEX "idx_request_logs_success" ON "request_logs" ("success");
CREATE INDEX "idx_request_logs_created_at" ON "request_logs" ("created_at");
CREATE INDEX "idx_request_logs_error_category" ON "request_logs" ("error_category") WHERE "error_category" IS NOT NULL;
