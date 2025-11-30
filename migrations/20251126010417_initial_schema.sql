-- Create "users" table
CREATE TABLE "public"."users" (
  "id" serial NOT NULL,
  "username" character varying(255) NOT NULL,
  "display_name" character varying(255) NULL,
  "password_hash" character varying(255) NOT NULL,
  "is_sandbox" boolean NULL DEFAULT false,
  "session_token" character varying(255) NULL,
  "session_expires_at" timestamptz NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "users_username_key" UNIQUE ("username")
);
-- Create "accounts" table
CREATE TABLE "public"."accounts" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "plaid_id" character varying(255) NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(50) NOT NULL,
  "balance" numeric(12,2) NOT NULL DEFAULT 0,
  "currency" character varying(3) NULL DEFAULT 'USD',
  "last_updated" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "accounts_plaid_id_key" UNIQUE ("plaid_id"),
  CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "budget_limits" table
CREATE TABLE "public"."budget_limits" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "category" character varying(255) NOT NULL,
  "limit_amount" numeric(12,2) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "budget_limits_category_key" UNIQUE ("category"),
  CONSTRAINT "budget_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "goals" table
CREATE TABLE "public"."goals" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "name" character varying(255) NOT NULL,
  "target_amount" numeric(12,2) NOT NULL,
  "current_amount" numeric(12,2) NULL DEFAULT 0,
  "is_primary" boolean NULL DEFAULT false,
  "target_date" date NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "income_sources" table
CREATE TABLE "public"."income_sources" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(50) NULL DEFAULT 'paycheck',
  "amount" numeric(12,2) NOT NULL,
  "frequency" character varying(50) NOT NULL,
  "next_date" date NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "income_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "income_allocations" table
CREATE TABLE "public"."income_allocations" (
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
  CONSTRAINT "income_allocations_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_sources" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "income_allocations_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "income_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "net_worth_history" table
CREATE TABLE "public"."net_worth_history" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "date" date NOT NULL,
  "net_worth" numeric(12,2) NOT NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "net_worth_history_date_key" UNIQUE ("date"),
  CONSTRAINT "net_worth_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "transactions" table
CREATE TABLE "public"."transactions" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "plaid_transaction_id" character varying(255) NULL,
  "account_id" integer NULL,
  "amount" numeric(12,2) NOT NULL,
  "date" date NOT NULL,
  "name" character varying(255) NOT NULL,
  "category" character varying(255) NULL,
  "pending" boolean NULL DEFAULT false,
  PRIMARY KEY ("id"),
  CONSTRAINT "transactions_plaid_transaction_id_key" UNIQUE ("plaid_transaction_id"),
  CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "user_settings" table
CREATE TABLE "public"."user_settings" (
  "id" serial NOT NULL,
  "user_id" integer NULL,
  "key" character varying(255) NOT NULL,
  "value" text NOT NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "user_settings_key_key" UNIQUE ("key"),
  CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
