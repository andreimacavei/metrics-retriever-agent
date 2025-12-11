import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL for Drizzle config');
}

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString
  }
});

