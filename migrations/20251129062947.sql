-- Rename a column from "allocation_type" to "unit"
ALTER TABLE "public"."income_budgets" RENAME COLUMN "allocation_type" TO "unit";
