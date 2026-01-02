-- Add odata_version enum and column to predefined_services
DO $$ BEGIN
    CREATE TYPE "public"."odata_version" AS ENUM('v2', 'v4');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "predefined_services" ADD COLUMN IF NOT EXISTS "odata_version" "odata_version" DEFAULT 'v2' NOT NULL;
ALTER TABLE "system_services" ADD COLUMN IF NOT EXISTS "odata_version" "odata_version";

-- Add unique constraint for predefined_services (system_type, alias)
DO $$ BEGIN
    ALTER TABLE "predefined_services" ADD CONSTRAINT "predefined_services_system_type_alias_unique" UNIQUE ("system_type", "alias");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
