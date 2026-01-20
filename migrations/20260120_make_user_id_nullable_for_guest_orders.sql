-- Migration: Make user_id nullable in orders table to support guest orders
-- Date: 2026-01-20

-- Drop the NOT NULL constraint from user_id
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure either user_id or session_id is present
-- This ensures we can track orders to either a user or a guest session
ALTER TABLE orders ADD CONSTRAINT orders_user_or_session_check 
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL);
