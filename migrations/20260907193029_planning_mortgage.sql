-- Modify "goals" table
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_plan_is_object" CHECK ((plan_inputs IS NULL) OR (jsonb_typeof(plan_inputs) = 'object'::text)), ADD CONSTRAINT "goals_plan_kind_check" CHECK ((plan_kind)::text = 'mortgage'::text), ADD CONSTRAINT "goals_plan_paired" CHECK ((plan_kind IS NULL) = (plan_inputs IS NULL)), ADD COLUMN "plan_kind" character varying(50) NULL, ADD COLUMN "plan_inputs" jsonb NULL;
-- Create "integration_audit" table
CREATE TABLE "public"."integration_audit" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "integration_id" character varying(50) NOT NULL,
  "host" character varying(255) NOT NULL,
  "purpose" character varying(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "integration_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
