-- Modify "income_sources" table
ALTER TABLE "public"."income_sources" ADD COLUMN "deleted_at" timestamptz NULL;
-- Modify "net_worth_history" table
ALTER TABLE "public"."net_worth_history" ADD COLUMN "deleted_at" timestamptz NULL;
-- Modify "transactions" table
ALTER TABLE "public"."transactions" ADD COLUMN "deleted_at" timestamptz NULL;
-- Create "audit_log" table
CREATE TABLE "public"."audit_log" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "entity_type" character varying(50) NOT NULL,
  "entity_id" integer NOT NULL,
  "action" character varying(10) NOT NULL,
  "batch_id" uuid NULL,
  "previous_value" jsonb NULL,
  "new_value" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "undone_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "import_configurations" table
CREATE TABLE "public"."import_configurations" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "name" character varying(255) NOT NULL,
  "column_mapping" jsonb NOT NULL,
  "behaviors" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "import_configurations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "import_history" table
CREATE TABLE "public"."import_history" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "configuration_id" integer NULL,
  "batch_id" uuid NULL,
  "filename" character varying(255) NOT NULL,
  "status" character varying(20) NOT NULL DEFAULT 'completed',
  "summary" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "import_history_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "public"."import_configurations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "import_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "import_errors" table
CREATE TABLE "public"."import_errors" (
  "id" serial NOT NULL,
  "import_id" integer NOT NULL,
  "row_number" integer NOT NULL,
  "field" character varying(255) NULL,
  "message" text NOT NULL,
  "severity" character varying(20) NOT NULL DEFAULT 'error',
  "raw_value" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "import_errors_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."import_history" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Modify "accounts" table
ALTER TABLE "public"."accounts" ADD COLUMN "deleted_at" timestamptz NULL;
-- Create "transfers" table
CREATE TABLE "public"."transfers" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "from_account_id" integer NOT NULL,
  "to_account_id" integer NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "transfer_date" date NOT NULL,
  "note" character varying(255) NULL,
  "tags" character varying(255) NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "transfers_amount_check" CHECK (amount > (0)::numeric),
  CONSTRAINT "transfers_check" CHECK (from_account_id <> to_account_id)
);
-- Create index "transfers_user_date_idx" to table: "transfers"
CREATE INDEX "transfers_user_date_idx" ON "public"."transfers" ("user_id", "transfer_date" DESC) WHERE (deleted_at IS NULL);
