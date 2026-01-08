-- Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID,
  "user_email" VARCHAR(255),
  "user_role" VARCHAR(50),
  "action" VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(100),
  "resource_id" VARCHAR(255),
  "description" TEXT NOT NULL,
  "metadata" TEXT,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "audit_logs_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource_type" ON "audit_logs"("resource_type");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- System Settings Table
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL DEFAULT 'general',
  "is_public" BOOLEAN DEFAULT FALSE NOT NULL,
  "updated_by" UUID,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "system_settings_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category");

-- Insert default system settings
INSERT INTO "system_settings" ("key", "value", "description", "category", "is_public")
VALUES 
  ('restaurant_name', 'My Restaurant', 'The name of the restaurant', 'branding', true),
  ('theme_primary_color', '#4F46E5', 'Primary theme color in hex format', 'branding', true),
  ('theme_secondary_color', '#10B981', 'Secondary theme color in hex format', 'branding', true),
  ('restaurant_logo_url', '', 'URL to the restaurant logo', 'branding', true),
  ('default_seats_per_table', '4', 'Default number of seats per table', 'workflow', false),
  ('order_auto_accept_enabled', 'false', 'Automatically accept orders without staff confirmation', 'workflow', false),
  ('kitchen_preparation_alert_time', '15', 'Alert time in minutes for preparation delays', 'workflow', false),
  ('enable_customer_feedback', 'true', 'Enable customer feedback after order completion', 'general', false)
ON CONFLICT ("key") DO NOTHING;
