CREATE TABLE "api_key_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"connection_service_id" uuid NOT NULL,
	"permissions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_access_api_key_id_connection_service_id_unique" UNIQUE("api_key_id","connection_service_id")
);
--> statement-breakpoint
CREATE TABLE "connection_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_path_override" varchar(500),
	"auth_type" "auth_type",
	"username" varchar(255),
	"password" varchar(500),
	"auth_config" jsonb,
	"credentials" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connection_services_connection_id_service_id_unique" UNIQUE("connection_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"alias" varchar(50) NOT NULL,
	"service_path" varchar(500) NOT NULL,
	"description" varchar(1000),
	"entities" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_connection_id_connections_id_fk";
--> statement-breakpoint
ALTER TABLE "api_key_access" ADD CONSTRAINT "api_key_access_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_access" ADD CONSTRAINT "api_key_access_connection_service_id_connection_services_id_fk" FOREIGN KEY ("connection_service_id") REFERENCES "public"."connection_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_services" ADD CONSTRAINT "connection_services_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_services" ADD CONSTRAINT "connection_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "connection_id";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "permissions";