import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';
import type { ComponentConfig } from '../lib/types';

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
    folderId: uuid('folder_id')
      .references(() => folders.id, { onDelete: 'cascade' }),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    lastSeenIdx: index('idx_users_last_seen_at').on(table.lastSeenAt)
  })
);

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }),
    eventName: text('event_name').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
    properties: jsonb('properties')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
  },
  (table) => ({
    userIdIdx: index('idx_events_user_id').on(table.userId),
    timestampIdx: index('idx_events_timestamp').on(table.timestamp),
    eventNameIdx: index('idx_events_event_name').on(table.eventName)
  })
);

