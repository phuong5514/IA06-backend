-- Add support for multiple photos with thumbnail selection
ALTER TABLE "menu_item_images" ADD COLUMN "is_thumbnail" boolean DEFAULT false NOT NULL;
ALTER TABLE "menu_item_images" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;

-- Set the first image of each menu item as thumbnail
UPDATE "menu_item_images" AS img
SET "is_thumbnail" = true
WHERE img."id" IN (
  SELECT MIN(id)
  FROM "menu_item_images"
  GROUP BY "menu_item_id"
);

-- Create index for faster queries
CREATE INDEX "menu_item_images_is_thumbnail_idx" ON "menu_item_images" ("is_thumbnail");
CREATE INDEX "menu_item_images_display_order_idx" ON "menu_item_images" ("display_order");
