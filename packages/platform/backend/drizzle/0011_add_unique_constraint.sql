-- Add unique constraint for predefined_services (system_type, alias)
DO $$ BEGIN
    ALTER TABLE "predefined_services" ADD CONSTRAINT "predefined_services_system_type_alias_unique" UNIQUE ("system_type", "alias");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
