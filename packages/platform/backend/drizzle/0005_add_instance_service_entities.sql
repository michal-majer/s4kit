-- Migration: Add entities field to instance_services table
-- Allows per-instance entity lists, with null meaning inherit from systemService

ALTER TABLE "instance_services" ADD COLUMN IF NOT EXISTS "entities" jsonb;
