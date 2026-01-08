-- Create menu_item_reviews table
CREATE TABLE IF NOT EXISTS "menu_item_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "menu_item_id" integer NOT NULL,
  "user_id" uuid NOT NULL,
  "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "comment" text,
  "admin_response" text,
  "admin_responded_at" timestamp,
  "admin_responded_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_menu_item_id_menu_items_id_fk" 
 FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_user_id_users_id_fk" 
 FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "menu_item_reviews" ADD CONSTRAINT "menu_item_reviews_admin_responded_by_users_id_fk" 
 FOREIGN KEY ("admin_responded_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "menu_item_reviews_menu_item_id_idx" ON "menu_item_reviews" ("menu_item_id");
CREATE INDEX IF NOT EXISTS "menu_item_reviews_user_id_idx" ON "menu_item_reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "menu_item_reviews_created_at_idx" ON "menu_item_reviews" ("created_at");
