-- Add short_code column to tables for easy manual QR code entry
ALTER TABLE "tables" ADD COLUMN "short_code" varchar(8) UNIQUE;

-- Add index for faster short code lookups
CREATE INDEX IF NOT EXISTS "idx_tables_short_code" ON "tables" ("short_code");
