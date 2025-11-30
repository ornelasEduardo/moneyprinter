-- Modify "transactions" table
ALTER TABLE "public"."transactions" ADD COLUMN "type" character varying(50) NULL DEFAULT 'expense';
