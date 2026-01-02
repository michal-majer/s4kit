-- Change verifications.value from varchar(255) to text to accommodate OAuth state JSON
ALTER TABLE "verifications" ALTER COLUMN "value" TYPE text;
