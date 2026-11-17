-- Modify "transactions" table
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payment_link" CHECK ((transfer_id IS NULL) OR (((type)::text = ANY ((ARRAY['payment_in'::character varying, 'payment_out'::character varying])::text[])) AND (account_id IS NOT NULL) AND (amount > (0)::numeric))), ADD CONSTRAINT "transactions_refund_reference" CHECK ((original_transaction_id IS NULL) OR (((type)::text = 'refund'::text) AND (original_transaction_id <> id))), ADD COLUMN "original_transaction_id" integer NULL, ADD COLUMN "transfer_id" integer NULL, ADD CONSTRAINT "transactions_original_transaction_id_fkey" FOREIGN KEY ("original_transaction_id") REFERENCES "public"."transactions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION, ADD CONSTRAINT "transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
-- Create index "transactions_active_transfer_account_idx" to table: "transactions"
CREATE UNIQUE INDEX "transactions_active_transfer_account_idx" ON "public"."transactions" ("transfer_id", "account_id") WHERE ((deleted_at IS NULL) AND (transfer_id IS NOT NULL));
-- Create index "transactions_original_transaction_id_idx" to table: "transactions"
CREATE INDEX "transactions_original_transaction_id_idx" ON "public"."transactions" ("original_transaction_id");
-- Create index "transactions_transfer_id_idx" to table: "transactions"
CREATE INDEX "transactions_transfer_id_idx" ON "public"."transactions" ("transfer_id");
