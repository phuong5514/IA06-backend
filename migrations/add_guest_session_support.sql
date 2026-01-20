-- Migration: Add Guest Session Support
-- Date: 2026-01-19
-- Description: Adds session_id to orders and is_guest to users for guest account functionality

-- Add session_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Add is_guest column to users table  
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index on session_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);

-- Create index on is_guest for guest account queries
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);

-- Add comment to document the purpose
COMMENT ON COLUMN orders.session_id IS 'Unique identifier for table ordering sessions, used to isolate orders by session';
COMMENT ON COLUMN users.is_guest IS 'Indicates if this is a temporary guest account created via QR code scanning';
