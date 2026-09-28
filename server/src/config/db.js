import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let listenersAttached = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected (warm serverless instance)
  mongoose.set('strictQuery', true);
  if (!listenersAttached) {
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
    listenersAttached = true;
  }
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  logger.info({ host: mongoose.connection.host }, 'MongoDB connected');
}
