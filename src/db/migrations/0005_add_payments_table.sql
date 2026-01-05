-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'stripe', 'card');

-- Create payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_payment_method_id TEXT,
  paid_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create payment_orders junction table (many-to-many)
CREATE TABLE payment_orders (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, order_id)
);

-- Create indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_table_id ON payments(table_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payment_orders_payment_id ON payment_orders(payment_id);
CREATE INDEX idx_payment_orders_order_id ON payment_orders(order_id);
