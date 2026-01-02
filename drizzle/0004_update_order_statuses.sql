-- Migration: Update order status enum and add rejection_reason field
-- Date: 2026-01-02

-- Step 1: Add new enum values to order_status type
-- Note: PostgreSQL requires careful handling of enum modifications

-- First, create a new enum type with all values
CREATE TYPE order_status_new AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled'
);

-- Step 2: Add rejection_reason column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 3: Update existing orders to use new status values
-- Convert 'confirmed' -> 'accepted' for existing orders
UPDATE orders SET status = 'confirmed'::text WHERE status::text = 'confirmed';

-- Convert 'delivered' -> 'served' for existing orders
UPDATE orders SET status = 'delivered'::text WHERE status::text = 'delivered';

-- Step 4: Change the column type to use the new enum
-- First, alter the column to text
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

-- Drop the old enum type
DROP TYPE order_status;

-- Rename the new enum type to the original name
ALTER TYPE order_status_new RENAME TO order_status;

-- Step 5: Convert the column back to the new enum type
ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status;

-- Step 6: Update the values that were temporarily stored as text
UPDATE orders SET status = 'accepted' WHERE status::text = 'confirmed';
UPDATE orders SET status = 'served' WHERE status::text = 'delivered';

-- Add comments for documentation
COMMENT ON COLUMN orders.rejection_reason IS 'Reason provided when order is rejected by waiter';
COMMENT ON TYPE order_status IS 'Order lifecycle: pending -> accepted -> preparing -> ready -> served -> completed. Can be rejected or cancelled at certain stages.';
