/* Creates the first admin from ADMIN_* env vars. Usage: npm run create-admin */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { User } from '../models/index.js';
import { createUserSchema } from '../validators/user.validator.js';

async function run() {
  const parsed = createUserSchema.safeParse({
    name: process.env.ADMIN_NAME || 'Workspace Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  });
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => logger.error(`ADMIN_${String(i.path[0]).toUpperCase()}: ${i.message}`));
    process.exit(1);
  }
  await connectDB();
  if (await User.exists({ email: parsed.data.email })) {
    logger.warn(`User ${parsed.data.email} already exists`);
  } else {
    await User.create(parsed.data);
    logger.info(`Admin ${parsed.data.email} created`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error({ err }, 'create-admin failed');
  process.exit(1);
});
