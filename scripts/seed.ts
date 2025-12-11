import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import {
  events,
  folders,
  plans,
  reports,
  subscriptions,
  users
} from '../drizzle/schema';
import type { ComponentConfig } from '../lib/types';

config({ path: '.env.local' });
config();

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL for seeding');
}

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client);

// Execute raw SQL schema
async function executeSchema() {
  const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf-8');
  await client.unsafe(schemaSql);
}

// Weighted random selection
const weightedRandom = <T>(items: T[], weights: number[]): T => {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
};

// Generate date with exponential growth (more recent = more likely)
const exponentialDate = (daysAgo: number): Date => {
  const now = Date.now();
  // Exponential distribution: more users signed up recently
  const random = Math.pow(Math.random(), 2); // Squared for exponential feel
  const offset = random * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

// Generate date biased toward weekdays and business hours
const businessHoursDate = (baseDate: Date, daysRange: number): Date => {
  const date = new Date(baseDate);
  const daysOffset = Math.floor(Math.random() * daysRange);
  date.setDate(date.getDate() + daysOffset);

  // Bias toward weekdays (Mon-Fri)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend - 20% chance to keep, otherwise shift to weekday
    if (Math.random() > 0.2) {
      date.setDate(date.getDate() + (dayOfWeek === 0 ? 1 : 2));
    }
  }

  // Bias toward business hours (9am-5pm)
  const hour = weightedRandom(
    [9, 10, 11, 12, 13, 14, 15, 16, 17, 8, 18, 19, 20, 21, 22, 7, 23, 0, 1, 2, 3, 4, 5, 6],
    [10, 15, 15, 12, 14, 15, 14, 12, 8, 5, 4, 3, 2, 1, 1, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.1, 0.2, 0.5]
  );
  date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

  return date;
};

// Generate company size with realistic distribution
const generateCompanySize = (): number => {
  const size = weightedRandom(
    [
      () => Math.floor(Math.random() * 10) + 1,      // 1-10
      () => Math.floor(Math.random() * 40) + 11,    // 11-50
      () => Math.floor(Math.random() * 150) + 51,   // 51-200
      () => Math.floor(Math.random() * 300) + 201   // 201-500
    ],
    [50, 30, 15, 5]
  );
  return size();
};

async function seed() {
  console.log('Applying schema (drop + create tables)...');
  await executeSchema();

  console.log('Seeding plans...');
  const insertedPlans = await db
    .insert(plans)
    .values([
      { name: 'trial', price: '0', billingCycle: 'monthly' },
      { name: 'starter', price: '29', billingCycle: 'monthly' },
      { name: 'pro', price: '79', billingCycle: 'monthly' },
      { name: 'enterprise', price: '299', billingCycle: 'yearly' }
    ])
    .returning({ id: plans.id, name: plans.name });

  const planMap = Object.fromEntries(
    insertedPlans.map((p) => [p.name, p.id])
  );

  console.log('Seeding users...');
  const userCount = 400;
  const insertedUsers = await db
    .insert(users)
    .values(
      Array.from({ length: userCount }).map((_, i) => ({
        email: `user${i + 1}@example.com`,
        companySize: generateCompanySize(),
        createdAt: exponentialDate(90) // Last 90 days, biased toward recent
      }))
    )
    .returning({ id: users.id, createdAt: users.createdAt, companySize: users.companySize });

  console.log('Seeding subscriptions...');
  const subscriptionData: {
    userId: string;
    planId: string;
    status: 'active' | 'canceled' | 'past_due';
    startedAt: Date;
    endsAt: Date | null;
    canceledAt: Date | null;
  }[] = [];

  for (const user of insertedUsers) {
    const createdAt = user.createdAt!;
    const daysSinceCreation = Math.floor(
      (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Determine initial plan based on weighted distribution
    // 40% trial, 35% starter, 20% pro, 5% enterprise
    let currentPlan = weightedRandom(
      ['trial', 'starter', 'pro', 'enterprise'] as const,
      [40, 35, 20, 5]
    );

    // Trial users: 30% convert after 7-14 days
    if (currentPlan === 'trial' && daysSinceCreation > 7) {
      const converted = Math.random() < 0.3;
      if (converted) {
        // Add trial subscription (ended)
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + Math.floor(Math.random() * 7) + 7);

        subscriptionData.push({
          userId: user.id,
          planId: planMap['trial'],
          status: 'canceled',
          startedAt: createdAt,
          endsAt: trialEnd,
          canceledAt: trialEnd
        });

        // Upgrade to paid plan
        currentPlan = weightedRandom(['starter', 'pro'] as const, [70, 30]);
        const paidStart = new Date(trialEnd);
        paidStart.setDate(paidStart.getDate() + 1);

        // Some paid users churn
        const churned = currentPlan === 'starter' ? Math.random() < 0.08 : Math.random() < 0.03;
        const pastDue = !churned && Math.random() < 0.05;

        subscriptionData.push({
          userId: user.id,
          planId: planMap[currentPlan],
          status: churned ? 'canceled' : pastDue ? 'past_due' : 'active',
          startedAt: paidStart,
          endsAt: churned ? new Date(paidStart.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          canceledAt: churned ? new Date(paidStart.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null
        });
      } else {
        // Trial expired without conversion
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + 14);

        subscriptionData.push({
          userId: user.id,
          planId: planMap['trial'],
          status: daysSinceCreation > 14 ? 'canceled' : 'active',
          startedAt: createdAt,
          endsAt: daysSinceCreation > 14 ? trialEnd : new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
          canceledAt: daysSinceCreation > 14 ? trialEnd : null
        });
      }
    } else {
      // Direct paid signup
      const churned =
        currentPlan === 'trial' ? false :
        currentPlan === 'starter' ? Math.random() < 0.08 :
        currentPlan === 'pro' ? Math.random() < 0.03 :
        Math.random() < 0.01;

      const pastDue = !churned && currentPlan !== 'trial' && Math.random() < 0.05;

      subscriptionData.push({
        userId: user.id,
        planId: planMap[currentPlan],
        status: churned ? 'canceled' : pastDue ? 'past_due' : 'active',
        startedAt: createdAt,
        endsAt: currentPlan === 'trial'
          ? new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
          : churned
            ? new Date(createdAt.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000)
            : null,
        canceledAt: churned
          ? new Date(createdAt.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000)
          : null
      });
    }
  }

  await db.insert(subscriptions).values(subscriptionData);

  console.log('Seeding events...');
  const eventData: {
    userId: string;
    action: 'login' | 'logout' | 'feature_used' | 'upgrade' | 'downgrade' | 'billing_failed';
    feature: 'dashboard' | 'reports' | null;
    timestamp: Date;
  }[] = [];

  // Build user activity profiles based on their subscription
  const userProfiles = new Map<string, { isActive: boolean; activityLevel: number; createdAt: Date }>();

  for (const sub of subscriptionData) {
    const existing = userProfiles.get(sub.userId);
    const isActive = sub.status === 'active' || sub.status === 'past_due';
    const activityLevel = sub.status === 'canceled' ? 0.2 : sub.status === 'past_due' ? 0.5 : 1;

    if (!existing || isActive) {
      const user = insertedUsers.find((u) => u.id === sub.userId);
      userProfiles.set(sub.userId, {
        isActive,
        activityLevel,
        createdAt: user?.createdAt || new Date()
      });
    }
  }

  for (const [userId, profile] of userProfiles) {
    const daysSinceCreation = Math.floor(
      (Date.now() - profile.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Base events per day based on activity level
    const eventsPerDay = profile.isActive
      ? Math.floor(Math.random() * 5 + 2) * profile.activityLevel
      : Math.floor(Math.random() * 2) * profile.activityLevel;

    const totalEvents = Math.floor(eventsPerDay * Math.min(daysSinceCreation, 30));

    for (let i = 0; i < totalEvents; i++) {
      const eventDate = businessHoursDate(profile.createdAt, Math.min(daysSinceCreation, 30));

      // Action distribution
      const action = weightedRandom(
        ['login', 'logout', 'feature_used', 'upgrade', 'downgrade', 'billing_failed'] as const,
        profile.isActive
          ? [30, 20, 45, 2, 1, 2]  // Active users: mostly feature usage and logins
          : [20, 15, 10, 0, 5, 50] // Churned: less activity, more billing issues
      );

      let feature: 'dashboard' | 'reports' | null = null;
      if (action === 'feature_used') {
        feature = weightedRandom(['dashboard', 'reports'] as const, [70, 30]);
      }

      eventData.push({
        userId,
        action,
        feature,
        timestamp: eventDate
      });
    }
  }

  // Insert events in batches
  const batchSize = 1000;
  for (let i = 0; i < eventData.length; i += batchSize) {
    await db.insert(events).values(eventData.slice(i, i + batchSize));
  }

  console.log(`Inserted ${eventData.length} events`);

  console.log('Creating sample folder and report...');
  const [defaultFolder] = await db
    .insert(folders)
    .values({
      name: 'SaaS Metrics',
      order: 0,
      icon: 'bar-chart',
      color: '#3b82f6'
    })
    .returning({ id: folders.id });

  if (defaultFolder) {
    const componentConfig: ComponentConfig = {
      components: [
        { type: 'kpi', title: 'Total Users', query: 'SELECT COUNT(DISTINCT id) FROM users' },
        { type: 'kpi', title: 'Active Subscriptions', query: 'SELECT COUNT(*) FROM subscriptions WHERE status = \'active\'' },
        {
          type: 'line_chart',
          title: 'Daily Active Users (30d)',
          query: 'SELECT date, COUNT(DISTINCT user_id) as daily_active_users FROM events GROUP BY date',
          xAxis: 'date',
          yAxis: 'daily_active_users',
          dateRange: 'last_30_days'
        },
        {
          type: 'pie_chart',
          title: 'Users by Plan',
          query: 'SELECT plan_name, COUNT(*) as user_count FROM users GROUP BY plan_name',
          valueKey: 'user_count',
          nameKey: 'plan_name'
        },
        {
          type: 'bar_chart',
          title: 'Feature Usage',
          query: 'SELECT feature, COUNT(*) as usage_count FROM feature_usage GROUP BY feature',
          xAxis: 'feature',
          yAxis: 'usage_count'
        }
      ]
    };

    await db.insert(reports).values({
      folderId: defaultFolder.id,
      name: 'SaaS Overview Dashboard',
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
