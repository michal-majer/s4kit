ALTER TABLE "request_logs" ADD COLUMN "sap_response_time" integer;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "request_body" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_body" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "request_headers" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_headers" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "error_message" varchar(2000);