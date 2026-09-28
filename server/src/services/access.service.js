import { ROLES } from '../config/constants.js';
import { Project, Task, Team } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Who can see / change what.
 *   admin - manages users, teams and projects; sees and edits everything
 *   user  - works on tasks in projects they are part of
 *
 * A user is part of a project if they were added to it directly or belong to
 * one of its teams. Projects a user isn't part of return 404.
 */
export const isAdmin = (user) => user.role === ROLES.ADMIN;
const idOf = (v) => String(v?._id ?? v);

// Deactivated users are filtered out of member lists (populate `match`).
const ACTIVE_MEMBERS = { select: 'name email role isActive', match: { isActive: true } };
export const PROJECT_POPULATE = [
  { path: 'createdBy', select: 'name email' },
  { path: 'members', ...ACTIVE_MEMBERS },
  { path: 'teams', select: 'name members', populate: { path: 'members', ...ACTIVE_MEMBERS } },
];

export async function visibleProjectsFilter(user) {
  if (isAdmin(user)) return {};
  const teamIds = await Team.find({ members: user._id }).distinct('_id');
  return { $or: [{ members: user._id }, { teams: { $in: teamIds } }] };
}

export async function visibleProjectIds(user) {
  if (isAdmin(user)) return null; // no restriction
  return Project.find(await visibleProjectsFilter(user)).distinct('_id');
}

/** Active people who can work on (and be assigned) tasks in a populated project. */
export function projectParticipants(project) {
  const people = new Map();
  const add = (u) => u && u.isActive !== false && people.set(idOf(u), u);
  project.members.forEach(add);
  project.teams.forEach((t) => t.members.forEach(add));
  return people;
}

export async function getProjectForUser(projectId, user) {
  const project = await Project.findById(projectId).populate(PROJECT_POPULATE);
  if (!project || (!isAdmin(user) && !projectParticipants(project).has(idOf(user._id)))) {
    throw ApiError.notFound('Project not found');
  }
  return project;
}

export async function getTaskForUser(taskId, user) {
  const task = await Task.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  try {
    return { task, project: await getProjectForUser(task.project, user) };
  } catch {
    throw ApiError.notFound('Task not found');
  }
}

/** Assignees must be active and part of the project (so they can actually see the task). */
export function assertAssignable(project, userId) {
  if (userId && !projectParticipants(project).has(String(userId))) {
    throw ApiError.field('assignee', 'Tasks can only be assigned to active people who are part of the project');
  }
}

/** After people leave a team/project, their open tasks there go back to unassigned. */
export async function unassignNonParticipants(projectIds) {
  let changed = 0;
  for (const id of projectIds) {
    const project = await Project.findById(id).populate(PROJECT_POPULATE);
    if (!project) continue;
    const allowed = [...projectParticipants(project).keys()];
    const { modifiedCount } = await Task.updateMany(
      { project: id, status: { $nin: ['done', 'closed'] }, assignee: { $ne: null, $nin: allowed } },
      { assignee: null, assignedAt: null }
    );
    changed += modifiedCount;
  }
  return changed;
}
