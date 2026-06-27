import { serve } from 'bun';
import app from './index';
import { initializeDb } from './lib/db';

// Initialize database and run migrations
initializeDb();

const server = serve({
  fetch: app.fetch,
  port: 3000,
});

console.log(`Server running at http://localhost:3000`);
