ALTER TABLE "instance_services" ADD COLUMN "verification_status" varchar(20);
ALTER TABLE "instance_services" ADD COLUMN "last_verified_at" timestamp;
ALTER TABLE "instance_services" ADD COLUMN "verification_error" varchar(500);
ALTER TABLE "instance_services" ADD COLUMN "entity_count" integer;
