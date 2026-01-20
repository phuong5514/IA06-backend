import {
  pgTable,
  serial,
  uuid,
  integer,
  decimal,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './schema';
import { tables } from './schema';
import { orders } from './schema';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'stripe',
  'card',
]);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id, { onDelete: 'restrict' }),
  table_id: integer('table_id').references(() => tables.id, {
    onDelete: 'set null',
  }),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status')
    .notNull()
    .default('pending'),
  stripe_payment_intent_id: text('stripe_payment_intent_id'),
  stripe_payment_method_id: text('stripe_payment_method_id'),
  paid_by_user_id: uuid('paid_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  notes: text('notes'),
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const paymentOrders = pgTable('payment_orders', {
  id: serial('id').primaryKey(),
  payment_id: integer('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type NewPaymentOrder = typeof paymentOrders.$inferInsert;
