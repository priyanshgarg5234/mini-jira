/**
 * Vercel entry point: runs the Express app as a serverless function.
 * The MongoDB connection is created once per warm instance and reused.
 */
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';

const app = createApp();
let connecting = null;

export default async function handler(req, res) {
  try {
    connecting ??= connectDB();
    await connecting;
  } catch (err) {
    connecting = null; // retry on the next request
    logger.error({ err }, 'Database connection failed');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'Service temporarily unavailable. Try again shortly.' } }));
    return;
  }
  return app(req, res);
}
