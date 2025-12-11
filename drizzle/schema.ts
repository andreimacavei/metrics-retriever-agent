import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';
import type { ComponentConfig } from '../lib/types';

// Enums
export const planNameEnum = pgEnum('plan_name', [
  'trial',
  'starter',
  'pro',
  'enterprise'
]);

export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due'
]);

export const actionEnum = pgEnum('action', [
  'login',
  'logout',
  'feature_used',
  'upgrade',
  'downgrade',
  'billing_failed'
]);

export const featureEnum = pgEnum('feature', ['dashboard', 'reports']);

// Tables
export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  order: integer('order').default(0),
  icon: text('icon'),
  color: text('color')
});

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    folderId: uuid('folder_id').references(() => folders.id, {
      onDelete: 'cascade'
    }),
    name: text('name').notNull(),
    componentConfig: jsonb('component_config')
      .$type<ComponentConfig>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    folderIdx: index('idx_reports_folder_id').on(table.folderId)
  })
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    companySize: integer('company_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    createdAtIdx: index('idx_users_created_at').on(table.createdAt)
  })
);

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: planNameEnum('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  billingCycle: billingCycleEnum('billing_cycle').notNull()
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => plans.id, { onDelete: 'cascade' })
      .notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true })
  },
  (table) => ({
    userIdIdx: index('idx_subscriptions_user_id').on(table.userId),
    planIdIdx: index('idx_subscriptions_plan_id').on(table.planId),
    statusIdx: index('idx_subscriptions_status').on(table.status)
  })
);

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    action: actionEnum('action').notNull(),
    feature: featureEnum('feature'),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userIdIdx: index('idx_events_user_id').on(table.userId),
    timestampIdx: index('idx_events_timestamp').on(table.timestamp),
    actionIdx: index('idx_events_action').on(table.action)
  })
);
