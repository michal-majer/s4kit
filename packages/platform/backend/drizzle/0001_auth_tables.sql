-- Better-auth tables + subscriptions

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
