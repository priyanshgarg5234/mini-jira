/**
 * One-off migration for databases created by earlier versions:
 *   - role "manager"/"member" -> "user"
 *   - team.manager -> becomes a regular team member
 *   - project.owner -> project.createdBy (and stays on the project as a member)
 * Safe to run more than once. Usage: npm run migrate
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { logger } from '../config/logger.js';

async function run() {
  await connectDB();
  const db = mongoose.connection.db;

  const roles = await db.collection('users').updateMany({ role: { $in: ['manager', 'member'] } }, { $set: { role: 'user' } });
  logger.info(`Users converted to "user": ${roles.modifiedCount}`);

  let teams = 0;
  for (const team of await db.collection('teams').find({ manager: { $exists: true } }).toArray()) {
    await db.collection('teams').updateOne({ _id: team._id }, { $addToSet: { members: team.manager }, $unset: { manager: '' } });
    teams += 1;
  }
  logger.info(`Team managers turned into members: ${teams}`);

  let projects = 0;
  for (const p of await db.collection('projects').find({ owner: { $exists: true } }).toArray()) {
    await db.collection('projects').updateOne(
      { _id: p._id },
      { $set: { createdBy: p.owner }, $addToSet: { members: p.owner }, $unset: { owner: '' } }
    );
    projects += 1;
  }
  logger.info(`Project owners migrated: ${projects}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  logger.error({ err }, 'Migration failed');
  await mongoose.disconnect();
  process.exit(1);
});
