-- Modify "income_budgets" table
ALTER TABLE "public"."income_budgets" ADD COLUMN "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP;
