-- Create "categorization_rules" table
CREATE TABLE "public"."categorization_rules" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "name" character varying(255) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 0,
  "conditions" jsonb NOT NULL,
  "actions" jsonb NOT NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "categorization_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "categorization_rules_priority_idx" to table: "categorization_rules"
CREATE INDEX "categorization_rules_priority_idx" ON "public"."categorization_rules" ("user_id", "priority" DESC) WHERE ((deleted_at IS NULL) AND (enabled = true));
-- Create "provenance" table
CREATE TABLE "public"."provenance" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "entity_type" character varying(50) NOT NULL,
  "entity_id" integer NOT NULL,
  "field" character varying(100) NOT NULL,
  "value" character varying(255) NULL,
  "source_type" character varying(50) NOT NULL,
  "source_id" integer NULL,
  "created_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "provenance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "provenance_entity_idx" to table: "provenance"
CREATE INDEX "provenance_entity_idx" ON "public"."provenance" ("entity_type", "entity_id");
-- Create index "provenance_source_idx" to table: "provenance"
CREATE INDEX "provenance_source_idx" ON "public"."provenance" ("source_type", "source_id");
