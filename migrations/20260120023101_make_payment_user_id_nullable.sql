-- Make user_id nullable in payments table to support guest payments with sessionId
ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
