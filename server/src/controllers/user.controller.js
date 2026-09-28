import { FINISHED_STATUSES } from '../config/constants.js';
import { Task, User } from '../models/index.js';
import { revokeAllForUser } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/query.js';

/**
 * Deactivated users exist only in the database: the app never lists, shows or
 * edits them. Every lookup here is limited to active users.
 */
async function findActiveUser(id) {
  const user = await User.findOne({ _id: id, isActive: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export const listUsers = asyncHandler(async (req, res) => {
  const { q, role } = req.validatedQuery;
  const filter = { isActive: true };
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  res.json({ items: await User.find(filter).sort({ name: 1 }).limit(500) });
});

export const getUser = asyncHandler(async (req, res) => {
  res.json({ user: await findActiveUser(req.params.id) });
});

export const createUser = asyncHandler(async (req, res) => {
  const existing = await User.findOne({ email: req.body.email }, 'isActive');
  if (existing?.isActive) throw ApiError.field('email', 'A user with this email already exists');
  if (existing) {
    // Deleted (deactivated) accounts are never shown, so the email can't be reused.
    throw ApiError.field('email', 'This email belongs to a deleted account and cannot be reused');
  }
  const user = await User.create(req.body);
  req.log.info({ newUserId: String(user._id), role: user.role }, 'User created');
  res.status(201).json({ user });
});

/**
 * Update an active user. Setting isActive=false is how users are "deleted":
 * the record stays in the database (tasks and comments keep their author) but
 * the user can't sign in and disappears from the app. There is no way back
 * through the app; reactivation is a database operation.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const self = id === String(req.user._id);
  if (self && (req.body.role || req.body.isActive === false)) {
    throw ApiError.badRequest('You cannot change your own role or deactivate your own account');
  }

  const user = await findActiveUser(id);
  if (req.body.email && req.body.email !== user.email && (await User.exists({ email: req.body.email }))) {
    throw ApiError.field('email', 'A user with this email already exists');
  }

  const deactivating = req.body.isActive === false;
  const securityChange = (req.body.role && req.body.role !== user.role) || deactivating || Boolean(req.body.password);

  Object.assign(user, req.body);
  if (deactivating) user.deactivatedAt = new Date();
  await user.save();

  let unassignedTasks = 0;
  if (securityChange) await revokeAllForUser(user._id); // sign out everywhere
  if (deactivating) {
    // Open work shouldn't sit with someone who can't sign in.
    ({ modifiedCount: unassignedTasks } = await Task.updateMany(
      { assignee: user._id, status: { $nin: FINISHED_STATUSES } },
      { assignee: null, assignedAt: null }
    ));
  }

  req.log.info({ targetUserId: id, fields: Object.keys(req.body), unassignedTasks }, deactivating ? 'User deactivated' : 'User updated');
  res.json({ user, unassignedTasks });
});
