import { FINISHED_STATUSES } from '../config/constants.js';
import { Comment, Project, Task } from '../models/index.js';
import {
  assertAssignable,
  getProjectForUser,
  getTaskForUser,
  isAdmin,
  visibleProjectIds,
} from '../services/access.service.js';
import { diffTask, logActivity, taskHistory } from '../services/activity.service.js';
import { notifyStatusChanged, notifyTaskAssigned } from '../services/email.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertValidDueDate, dueDateToISO, isoToDueDate, todayISO } from '../utils/dates.js';
import { escapeRegex, getPagination, paginated } from '../utils/query.js';

const POPULATE = [
  { path: 'assignee', select: 'name email' },
  { path: 'reporter', select: 'name email' },
  { path: 'project', select: 'name key' },
];

const SORT = {
  updatedAt: { updatedAt: 1 },
  '-updatedAt': { updatedAt: -1 },
  createdAt: { createdAt: 1 },
  '-createdAt': { createdAt: -1 },
  priority: { priorityRank: 1, updatedAt: -1 },
  '-priority': { priorityRank: -1, updatedAt: -1 },
  dueDate: { dueDate: 1, priorityRank: -1 },
  '-dueDate': { dueDate: -1, priorityRank: -1 },
};

export const listTasks = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = {};

  if (q.project) {
    await getProjectForUser(q.project, req.user); // access check
    filter.project = q.project;
  } else {
    const ids = await visibleProjectIds(req.user);
    if (ids) filter.project = { $in: ids };
  }

  if (q.status?.length) filter.status = { $in: q.status };
  if (q.priority?.length) filter.priority = { $in: q.priority };
  if (q.assignee === 'me') filter.assignee = req.user._id;
  else if (q.assignee === 'unassigned') filter.assignee = null;
  else if (q.assignee) filter.assignee = q.assignee;
  if (q.overdue === 'true') {
    const open = (q.status?.length ? q.status : undefined)?.filter((s) => !FINISHED_STATUSES.includes(s));
    filter.status = open ? { $in: open } : { $nin: FINISHED_STATUSES };
    filter.dueDate = { $lt: isoToDueDate(todayISO()) };
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ title: rx }, { key: rx }, { description: rx }];
  }

  const pagination = getPagination(q, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Task.find(filter).sort(SORT[q.sort]).skip(pagination.skip).limit(pagination.limit).populate(POPULATE),
    Task.countDocuments(filter),
  ]);
  res.json(paginated(items, total, pagination));
});

export const getTask = asyncHandler(async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  await task.populate(POPULATE);
  res.json({ task, permissions: permissionsFor(task, req.user) });
});

export const createTask = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.body.project, req.user);
  const { dueDate, assignee, ...rest } = req.body;
  if (rest.status === 'closed') throw ApiError.field('status', 'A new task cannot start as closed');

  assertAssignable(project, assignee);
  const assignedAt = assignee ? new Date() : null;
  assertValidDueDate({ dueDate, assignedAt, dueDateChanged: true });

  const { taskSeq } = await Project.findByIdAndUpdate(
    project._id,
    { $inc: { taskSeq: 1 } },
    { new: true, select: '+taskSeq' }
  );

  const task = await Task.create({
    ...rest,
    assignee,
    assignedAt,
    dueDate: isoToDueDate(dueDate),
    key: `${project.key}-${taskSeq}`,
    reporter: req.user._id,
  });
  await logActivity(task, req.user, 'created');
  await task.populate(POPULATE);

  req.log.info({ taskId: String(task._id), key: task.key }, 'Task created');
  if (task.assignee) notifyTaskAssigned({ task, assignee: task.assignee, actor: req.user });
  res.status(201).json({ task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { task, project } = await getTaskForUser(req.params.id, req.user);
  const updates = { ...req.body };
  const previousStatus = task.status;

  // ---- closed tasks are read-only until reopened ----
  if (task.status === 'closed') {
    const reopening = updates.status && updates.status !== 'closed';
    const otherFields = Object.keys(updates).filter((k) => k !== 'status');
    if (!reopening || otherFields.length) {
      throw ApiError.badRequest('This task is closed. Reopen it (change its status) before editing.');
    }
  }

  // ---- assignment rules ----
  const assigneeChanged = 'assignee' in updates && String(updates.assignee ?? '') !== String(task.assignee ?? '');
  if (assigneeChanged) {
    const isCurrentAssignee = task.assignee && String(task.assignee) === String(req.user._id);
    // Anyone on the project can assign an UNASSIGNED task. Changing an existing
    // assignment is limited to admins and the current assignee (handing it on).
    if (task.assignee && !isAdmin(req.user) && !isCurrentAssignee) {
      throw ApiError.forbidden('This task is already assigned. Only an admin or the current assignee can reassign it.');
    }
    assertAssignable(project, updates.assignee);
    updates.assignedAt = updates.assignee ? new Date() : null;
  } else {
    delete updates.assignee;
  }

  // ---- due date rules ----
  const dueDateChanged = 'dueDate' in updates && updates.dueDate !== dueDateToISO(task.dueDate);
  if (dueDateChanged || assigneeChanged) {
    assertValidDueDate({
      dueDate: dueDateChanged ? updates.dueDate : dueDateToISO(task.dueDate),
      assignedAt: assigneeChanged ? updates.assignedAt : task.assignedAt,
      dueDateChanged,
    });
  }
  const changes = diffTask(task, updates);
  if ('dueDate' in updates) updates.dueDate = isoToDueDate(updates.dueDate);
  if (!changes.length) {
    await task.populate(POPULATE);
    return res.json({ task, permissions: permissionsFor(task, req.user) });
  }

  Object.assign(task, updates);
  await task.save();
  await logActivity(task, req.user, 'updated', changes);
  await task.populate(POPULATE);

  req.log.info({ taskId: String(task._id), fields: Object.keys(req.body) }, 'Task updated');
  if (assigneeChanged && task.assignee) notifyTaskAssigned({ task, assignee: task.assignee, actor: req.user });
  if (updates.status && updates.status !== previousStatus) {
    notifyStatusChanged({ task, reporter: task.reporter, actor: req.user, from: previousStatus, to: task.status });
  }

  res.json({ task, permissions: permissionsFor(task, req.user) });
});

/** Sent to the client so the UI only offers what the server will accept. Tasks are never deleted. */
function permissionsFor(task, user) {
  const assigneeId = task.assignee ? String(task.assignee?._id ?? task.assignee) : null;
  const open = task.status !== 'closed';
  return {
    canEdit: open,
    canReassign: open && (isAdmin(user) || !assigneeId || assigneeId === String(user._id)),
  };
}

// ---------------- history & comments ----------------

export const getTaskActivity = asyncHandler(async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  res.json({ items: await taskHistory(task._id) });
});

export const listComments = asyncHandler(async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  const items = await Comment.find({ task: task._id }).sort({ createdAt: 1 }).populate('author', 'name email');
  res.json({ items });
});

/** Comments are allowed on closed tasks too (e.g. "why was this closed?"). */
export const addComment = asyncHandler(async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  const comment = await Comment.create({ task: task._id, author: req.user._id, body: req.body.body });
  await logActivity(task, req.user, 'commented');
  await comment.populate('author', 'name email');
  req.log.info({ taskId: String(task._id), commentId: String(comment._id) }, 'Comment added');
  res.status(201).json({ comment });
});

/** Authors can fix typos in their own comments. Comments are never deleted. */
export const updateComment = asyncHandler(async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  const comment = await Comment.findOne({ _id: req.params.commentId, task: task._id });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (String(comment.author) !== String(req.user._id)) throw ApiError.forbidden('You can only edit your own comments');
  comment.body = req.body.body;
  comment.editedAt = new Date();
  await comment.save();
  await comment.populate('author', 'name email');
  res.json({ comment });
});
