-- Modify "budget_limits" table
ALTER TABLE "public"."budget_limits" ALTER COLUMN "user_id" SET NOT NULL;
-- Modify "net_worth_history" table
ALTER TABLE "public"."net_worth_history" ALTER COLUMN "user_id" SET NOT NULL;
-- Modify "user_settings" table
ALTER TABLE "public"."user_settings" ALTER COLUMN "user_id" SET NOT NULL;
