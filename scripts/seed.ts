import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { events, folders, reports, users } from '../drizzle/schema';
import type { ComponentConfig } from '../lib/types';

config({ path: '.env.local' });
config();

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL for seeding');
}

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client);

const randomDateWithinDays = (days: number) => {
  const now = Date.now();
  const earliest = now - days * 24 * 60 * 60 * 1000;
  return new Date(earliest + Math.random() * (now - earliest));
};

async function seed() {
  console.log('Resetting tables...');
  await db.delete(events);
  await db.delete(reports);
  await db.delete(folders);
  await db.delete(users);

  console.log('Seeding users...');
  const insertedUsers = await db
    .insert(users)
    .values(
      Array.from({ length: 100 }).map(() => ({
        createdAt: randomDateWithinDays(30),
        lastSeenAt: randomDateWithinDays(7)
      }))
    )
    .returning({ id: users.id });

  const userIds = insertedUsers.map((user) => user.id);

  console.log('Seeding events...');
  const eventNames = ['page_view', 'button_click', 'form_submit', 'purchase', 'login'];
  await db.insert(events).values(
    Array.from({ length: 1000 }).map(() => ({
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      eventName: eventNames[Math.floor(Math.random() * eventNames.length)],
      timestamp: randomDateWithinDays(30),
      properties: {
        page: '/home',
        duration: Math.floor(Math.random() * 300)
      }
    }))
  );

  console.log('Creating sample folder and report...');
  const [defaultFolder] = await db
    .insert(folders)
    .values({
      name: 'Sample Reports',
      order: 0,
      icon: 'bar-chart',
      color: '#3b82f6'
    })
    .returning({ id: folders.id });

  if (defaultFolder) {
    const componentConfig: ComponentConfig = {
      components: [
        { type: 'kpi', title: 'Total Users', metric: 'count_distinct_users' },
        { type: 'kpi', title: 'Total Events', metric: 'count_events' },
        {
          type: 'line_chart',
          title: 'DAU (30d)',
          xAxis: 'date',
          yAxis: 'daily_active_users',
          groupBy: 'day',
          dateRange: 'last_30_days'
        },
        {
          type: 'bar_chart',
          title: 'Events by Type',
          xAxis: 'event_name',
          yAxis: 'count_events',
          groupBy: 'day',
          dateRange: 'last_30_days'
        },
        {
          type: 'table',
          title: 'Recent Events',
          columns: ['timestamp', 'event_name', 'user_id']
        }
      ]
    };

    await db.insert(reports).values({
      folderId: defaultFolder.id,
      name: 'User Engagement Overview',
      componentConfig
    });
  }

  console.log('Seed completed');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

