-- Create "user_passwords" table
CREATE TABLE "public"."user_passwords" (
  "user_id" integer NOT NULL,
  "password_hash" character varying(255) NOT NULL,
  "updated_at" timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id"),
  CONSTRAINT "user_passwords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
