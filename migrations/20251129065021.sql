-- Modify "income_sources" table
ALTER TABLE "public"."income_sources" ADD COLUMN "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP;
