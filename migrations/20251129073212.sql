-- Modify "budget_limits" table
ALTER TABLE "public"."budget_limits" DROP CONSTRAINT "budget_limits_category_key", ADD CONSTRAINT "budget_limits_user_id_category_key" UNIQUE ("user_id", "category");
-- Modify "net_worth_history" table
ALTER TABLE "public"."net_worth_history" DROP CONSTRAINT "net_worth_history_date_key", ADD CONSTRAINT "net_worth_history_user_id_date_key" UNIQUE ("user_id", "date");
-- Modify "user_settings" table
ALTER TABLE "public"."user_settings" DROP CONSTRAINT "user_settings_key_key", ADD CONSTRAINT "user_settings_user_id_key_key" UNIQUE ("user_id", "key");
