CREATE TYPE "public"."menu_item_status" AS ENUM('available', 'unavailable', 'sold_out');--> statement-breakpoint
ALTER TABLE "menu_items" RENAME COLUMN "is_available" TO "status";--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "status" TYPE "public"."menu_item_status" USING CASE WHEN "status" = true THEN 'available'::"public"."menu_item_status" ELSE 'unavailable'::"public"."menu_item_status" END;--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "status" SET DEFAULT 'available';