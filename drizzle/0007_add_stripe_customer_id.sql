-- Add stripe_customer_id to users table
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" ("stripe_customer_id");
