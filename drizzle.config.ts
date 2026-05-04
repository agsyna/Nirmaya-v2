import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import 'dotenv/config';

dotenv.config({ path: '.env' });

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error('Missing database URL. Set DATABASE_URL.');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionUrl,
    ssl: { rejectUnauthorized: false },
  },
  verbose: true,
  strict: true,
});
