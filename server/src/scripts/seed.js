/**
 * Mock data: 12 users (1 deactivated), 4 teams, 6 projects, 28 tasks with comments and history.
 *
 *   npm run seed          -> only runs on an empty database
 *   npm run seed:reset    -> WIPES all data first, then seeds
 *
 * Every user's password is Password123.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Activity, Comment, Project, RefreshToken, Task, Team, User } from '../models/index.js';
import { todayISO } from '../utils/dates.js';

const PASSWORD = 'Password123';
const reset = process.argv.includes('--reset');

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const dueIn = (n) => {
  const d = new Date(`${todayISO()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const PRIORITY_RANK = { low: 1, medium: 2, high: 3 };

// [handle, name, role, active]
const USERS = [
  ['admin', 'Asha Admin', 'admin', true],
  ['manav', 'Manav Rao', 'user', true],
  ['neha', 'Neha Kapoor', 'user', true],
  ['priya', 'Priya Shah', 'user', true],
  ['rohan', 'Rohan Mehta', 'user', true],
  ['kabir', 'Kabir Singh', 'user', true],
  ['isha', 'Isha Verma', 'user', true],
  ['arjun', 'Arjun Nair', 'user', true],
  ['meera', 'Meera Iyer', 'user', true],
  ['dev', 'Dev Malhotra', 'user', true],
  ['sara', 'Sara Khan', 'user', true],
  ['vikram', 'Vikram Joshi', 'user', false], // shows how "deleted" (deactivated) users look
];

// People appear in several teams on purpose.
const TEAMS = [
  ['Web Team', 'Storefront and internal web apps.', ['manav', 'priya', 'rohan', 'kabir']],
  ['Mobile Team', 'iOS and Android apps.', ['neha', 'isha', 'arjun', 'priya']],
  ['Backend Team', 'APIs, payments and data.', ['manav', 'meera', 'dev', 'rohan', 'vikram']],
  ['QA Team', 'Testing and release checks.', ['neha', 'sara', 'kabir']],
];

// [key, name, description, (unused), teams, individual members]
const PROJECTS = [
  ['WEB', 'Storefront Web', 'Customer-facing storefront: catalog, cart and checkout.', 'manav', ['Web Team', 'QA Team'], []],
  ['MOB', 'Mobile App', 'Shopping app for iOS and Android.', 'neha', ['Mobile Team', 'QA Team'], ['meera']],
  ['PAY', 'Payments API', 'Payment gateway integrations, refunds and webhooks.', 'manav', ['Backend Team'], ['sara']],
  ['ADM', 'Admin Dashboard', 'Internal tool for orders, stock and customer support.', 'manav', ['Web Team', 'Backend Team'], []],
  ['SRCH', 'Search Revamp', 'Faster product search with typo tolerance and filters.', 'neha', ['Backend Team'], ['neha', 'priya', 'isha']],
  ['MKT', 'Marketing Site', 'Landing pages, blog and SEO.', 'neha', ['Web Team'], ['neha', 'arjun']],
];

// [project, title, priority, status, assignee|null, reporter, dueInDays|null, createdDaysAgo]
// [taskKey, author, body, hoursAfterCreation]
const COMMENTS = [
  ['WEB-1', 'priya', 'Reproduced on iOS 17 and 18. The click handler is bound to an overlay that is still disabled.', 5],
  ['WEB-1', 'sara', 'Confirmed on an iPhone 13 as well. Android is fine.', 9],
  ['WEB-1', 'priya', 'Fix is in review. Removing the overlay once the payment SDK finishes loading.', 30],
  ['WEB-2', 'sara', 'Happens with KWD and BHD. Totals are off by 0.001.', 3],
  ['WEB-6', 'kabir', 'Validation only checks the code format, not the expiry date. Adding a server-side check.', 6],
  ['MOB-1', 'isha', 'Crash log attached in the release channel. Null order list when offline.', 4],
  ['MOB-1', 'neha', 'Please add an offline empty state while you are in there.', 12],
  ['PAY-1', 'meera', 'Retries use the same idempotency key, so the gateway accepts both. Switching to per-attempt keys.', 8],
  ['PAY-1', 'manav', 'Make sure we log both attempt ids so support can trace them.', 20],
  ['SRCH-1', 'meera', 'Trying trigram matching first; benchmark numbers in SRCH-4.', 10],
  ['MKT-1', 'arjun', 'Designs approved. Building the hero section today.', 6],
  ['ADM-2', 'rohan', 'CSV export works for up to 50k rows. Streaming the response for larger exports.', 15],
];

const TASKS = [
  ['WEB', 'Checkout button unresponsive on Safari iOS', 'high', 'in_progress', 'priya', 'manav', 2, 6],
  ['WEB', 'Cart total rounds incorrectly for 3-decimal currencies', 'high', 'todo', null, 'sara', 5, 3],
  ['WEB', 'Add wishlist to product page', 'medium', 'todo', 'rohan', 'manav', 12, 8],
  ['WEB', 'Lazy-load images below the fold', 'low', 'in_review', 'kabir', 'rohan', 7, 10],
  ['WEB', 'Update footer links', 'low', 'done', 'priya', 'manav', null, 20],
  ['WEB', 'Coupon field accepts expired codes', 'high', 'todo', 'kabir', 'sara', -1, 9],
  ['MOB', 'App crashes when opening order history offline', 'high', 'in_progress', 'isha', 'neha', 3, 5],
  ['MOB', 'Add biometric login', 'medium', 'todo', 'arjun', 'neha', 20, 4],
  ['MOB', 'Push notification opens wrong screen', 'medium', 'in_review', 'priya', 'sara', 4, 7],
  ['MOB', 'Dark mode colours on product cards', 'low', 'todo', null, 'isha', 15, 2],
  ['MOB', 'Upgrade to latest Android SDK', 'medium', 'closed', 'arjun', 'neha', null, 30],
  ['PAY', 'Webhook retries fire twice on timeout', 'high', 'in_progress', 'meera', 'manav', 1, 4],
  ['PAY', 'Document the refunds endpoint', 'medium', 'done', 'dev', 'manav', null, 14],
  ['PAY', 'Add UPI as a payment method', 'high', 'todo', 'dev', 'manav', 10, 3],
  ['PAY', 'Test partial refunds end to end', 'medium', 'todo', 'sara', 'meera', 6, 2],
  ['PAY', 'Rotate payment gateway API keys', 'high', 'closed', 'rohan', 'manav', null, 25],
  ['ADM', 'Order search times out for large date ranges', 'high', 'todo', null, 'kabir', 4, 1],
  ['ADM', 'Export orders to CSV', 'medium', 'in_progress', 'rohan', 'manav', 8, 6],
  ['ADM', 'Low-stock alert threshold per product', 'low', 'todo', 'priya', 'manav', 18, 5],
  ['ADM', 'Show customer notes on order page', 'low', 'in_review', 'kabir', 'dev', 3, 9],
  ['SRCH', 'Typo-tolerant search for product names', 'high', 'in_progress', 'meera', 'neha', 9, 7],
  ['SRCH', 'Filter results by price range', 'medium', 'todo', 'isha', 'neha', 14, 3],
  ['SRCH', 'Search results ignore out-of-stock toggle', 'medium', 'todo', null, 'priya', 5, 1],
  ['SRCH', 'Benchmark search latency before and after', 'low', 'done', 'dev', 'meera', null, 12],
  ['MKT', 'New landing page for festive sale', 'high', 'in_progress', 'arjun', 'neha', 2, 5],
  ['MKT', 'Fix broken links in blog archive', 'low', 'todo', 'kabir', 'arjun', 10, 4],
  ['MKT', 'Add structured data to product pages', 'medium', 'in_review', 'priya', 'neha', 6, 8],
  ['MKT', 'Compress hero images', 'low', 'closed', 'rohan', 'neha', null, 18],
];

async function seed() {
  await connectDB();

  const existing = await Promise.all([User, Team, Project, Task].map((M) => M.estimatedDocumentCount()));
  if (existing.some(Boolean) && !reset) {
    logger.error('The database already has data. Run `npm run seed:reset` to wipe it and load mock data.');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (reset) {
    await Promise.all([User, RefreshToken, Team, Project, Task, Comment, Activity].map((M) => M.deleteMany({})));
    logger.warn('Existing data deleted');
  }

  // Users (created one by one so passwords are hashed by the model hook)
  const users = {};
  for (const [handle, name, role, active] of USERS) {
    users[handle] = await User.create({
      name,
      email: `${handle}@minijira.dev`,
      password: PASSWORD,
      role,
      isActive: active,
      deactivatedAt: active ? null : daysAgo(10),
    });
  }

  const teams = {};
  for (const [name, description, members] of TEAMS) {
    teams[name] = await Team.create({ name, description, members: members.map((m) => users[m]._id) });
  }

  const projects = {};
  for (const [key, name, description, , teamNames, members] of PROJECTS) {
    projects[key] = await Project.create({
      key,
      name,
      description,
      createdBy: users.admin._id,
      teams: teamNames.map((t) => teams[t]._id),
      members: members.map((m) => users[m]._id),
    });
  }

  // Tasks are inserted directly so createdAt / assignedAt can be in the past
  // (the API would stamp "now"). Keys are numbered per project.
  const seq = {};
  const docs = TASKS.map(([key, title, priority, status, assignee, reporter, due, createdAgo]) => {
    seq[key] = (seq[key] ?? 0) + 1;
    const createdAt = daysAgo(createdAgo);
    return {
      project: projects[key]._id,
      key: `${key}-${seq[key]}`,
      title,
      description: `${title}.\n\nAcceptance criteria:\n- Works on desktop and mobile\n- Covered by a test`,
      priority,
      priorityRank: PRIORITY_RANK[priority],
      status,
      assignee: assignee ? users[assignee]._id : null,
      assignedAt: assignee ? createdAt : null,
      reporter: users[reporter]._id,
      dueDate: due == null ? null : dueIn(due),
      createdAt,
      updatedAt: daysAgo(Math.max(0, createdAgo - 1)),
      __v: 0,
    };
  });
  const { insertedIds } = await Task.collection.insertMany(docs);
  const taskByKey = new Map(docs.map((d, i) => [d.key, { ...d, _id: insertedIds[i] }]));

  // History: "created" for every task, plus a status change for tasks that moved on.
  const history = [];
  for (const t of taskByKey.values()) {
    history.push({ task: t._id, actor: t.reporter, action: 'created', changes: [], createdAt: t.createdAt });
    if (t.status !== 'todo') {
      history.push({
        task: t._id,
        actor: t.assignee ?? t.reporter,
        action: 'updated',
        changes: [{ field: 'status', from: 'todo', to: t.status }],
        createdAt: t.updatedAt,
      });
    }
  }

  const comments = COMMENTS.map(([key, author, body, hours]) => {
    const t = taskByKey.get(key);
    const createdAt = new Date(t.createdAt.getTime() + hours * 3600 * 1000);
    history.push({ task: t._id, actor: users[author]._id, action: 'commented', changes: [], createdAt });
    return { task: t._id, author: users[author]._id, body, editedAt: null, createdAt, updatedAt: createdAt, __v: 0 };
  });
  await Comment.collection.insertMany(comments);
  await Activity.collection.insertMany(history.map((h) => ({ ...h, __v: 0 })));
  await Promise.all(Object.entries(seq).map(([key, n]) => Project.updateOne({ key }, { taskSeq: n })));

  logger.info(
    `Seeded ${USERS.length} users, ${TEAMS.length} teams, ${PROJECTS.length} projects, ${TASKS.length} tasks and ${COMMENTS.length} comments.`
  );
  logger.info(`Sign in as admin@minijira.dev (admin) or priya@minijira.dev (user). Password: ${PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  logger.error({ err }, 'Seed failed');
  await mongoose.disconnect();
  process.exit(1);
});
