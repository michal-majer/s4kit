ALTER TYPE "public"."auth_type" ADD VALUE 'none' BEFORE 'basic';--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key_prefix" varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key_last_4" varchar(4) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "description" varchar(1000);--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "revoked_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_used_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash");