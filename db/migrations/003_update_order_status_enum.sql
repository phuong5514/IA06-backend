-- Migration: Update order_status enum and add rejection_reason column
-- This migration updates the existing order_status enum type and adds the rejection_reason field
-- Date: 2026-01-02

-- Step 1: Add rejection_reason column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Update the enum type by renaming and recreating
-- We need to handle this carefully because the enum is in use

-- First, add new enum values one by one (PostgreSQL 12+ supports this)
DO $$ 
BEGIN
    -- Add 'accepted' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        ALTER TYPE order_status ADD VALUE 'accepted' AFTER 'pending';
    END IF;
    
    -- Add 'rejected' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        ALTER TYPE order_status ADD VALUE 'rejected' AFTER 'accepted';
    END IF;
    
    -- Add 'served' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'served' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        ALTER TYPE order_status ADD VALUE 'served' AFTER 'ready';
    END IF;
    
    -- Add 'completed' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        ALTER TYPE order_status ADD VALUE 'completed' AFTER 'served';
    END IF;
END $$;

-- Step 3: Migrate existing data from old values to new values
-- 'confirmed' -> 'accepted'
UPDATE orders SET status = 'accepted'::order_status WHERE status = 'confirmed'::order_status;

-- 'delivered' -> 'served'
UPDATE orders SET status = 'served'::order_status WHERE status = 'delivered'::order_status;

-- Note: We cannot easily remove enum values from PostgreSQL enums
-- The old values 'confirmed' and 'delivered' will remain in the enum but won't be used
-- This is a PostgreSQL limitation - removing enum values requires recreating the type
-- which is more complex and risky in production

-- Add helpful comments
COMMENT ON COLUMN orders.rejection_reason IS 'Reason provided by waiter when order is rejected';
COMMENT ON COLUMN orders.status IS 'Order flow: pending -> accepted -> preparing -> ready -> served -> completed. Can be rejected or cancelled.';
