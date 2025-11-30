-- Create "income_budgets" table
CREATE TABLE "public"."income_budgets" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "income_source_id" integer NULL,
  "name" character varying(255) NOT NULL,
  "allocation_type" character varying(50) NOT NULL,
  "value" numeric(12,2) NOT NULL,
  "category" character varying(50) NOT NULL,
  "target_account_id" integer NULL,
  "increases_net_worth" boolean NULL DEFAULT true,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "income_budgets_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_sources" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "income_budgets_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "income_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Drop "income_allocations" table
DROP TABLE "public"."income_allocations";
